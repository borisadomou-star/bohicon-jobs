// Envoi automatique des notifications push de Bohicon Jobs.
// Exécuté toutes les 5 minutes par GitHub Actions (voir push.yml).
import admin from "firebase-admin";

const SITE = "https://borisadomou-star.github.io/bohicon-jobs/";
const AGE_MAX = 3 * 60 * 60 * 1000;   // pas d'alerte pour un événement plus vieux que 3 h

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore();
const fcm = admin.messaging();
const { Timestamp, FieldValue } = admin.firestore;
const MAINTENANT = Date.now();

const etatRef = db.doc("config/pushEtat");
const etat = await etatRef.get();
const AMORCAGE = !etat.exists;   // premier passage : on marque l'existant sans rien envoyer
const derniere = etat.exists && etat.data().derniere ? etat.data().derniere : Timestamp.fromMillis(MAINTENANT);
let envoyes = 0;

const ms = t => (t && typeof t.toMillis === "function" ? t.toMillis() : 0);
const court = (t, n = 60) => { const s = String(t || ""); return s.length > n ? s.slice(0, n - 1) + "…" : s; };

async function jetonsDe(uids){
  const liste = [...new Set(uids.filter(Boolean))];
  const jetons = [];
  for (let i = 0; i < liste.length; i += 10){
    const s = await db.collection("pushTokens").where("uid", "in", liste.slice(i, i + 10)).get();
    s.docs.forEach(d => jetons.push(d.id));
  }
  return jetons;
}

async function envoyer(uids, titre, corps, lien){
  const jetons = await jetonsDe(uids);
  if (!jetons.length) return;
  const r = await fcm.sendEachForMulticast({
    tokens: jetons,
    notification: { title: titre, body: corps },
    data: { lien: lien || SITE },
    webpush: {
      fcmOptions: { link: lien || SITE },
      notification: { icon: SITE + "icon-192.png", badge: SITE + "icon-192.png" }
    }
  });
  envoyes += r.successCount;
  await Promise.all(r.responses.map((x, i) => {
    const code = x.error && x.error.code;
    if (!x.success && (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token")){
      return db.collection("pushTokens").doc(jetons[i]).delete();   // jeton périmé
    }
    return null;
  }));
}

// ---------- Candidatures : nouvelle candidature, candidat retenu, mission confirmée ----------
const cs = await db.collection("candidatures").orderBy("createdAt", "desc").limit(300).get();
for (const d of cs.docs){
  const c = d.data();
  const maj = {};
  const lien = SITE + "#mission=" + c.missionId;
  if (!c.pushAuteur){
    if (!AMORCAGE && MAINTENANT - ms(c.createdAt) < AGE_MAX){
      await envoyer([c.auteurUid], "Nouvelle candidature", court(c.nom, 30) + " s'est proposé(e) pour « " + court(c.titre) + " ».", lien);
    }
    maj.pushAuteur = true;
  }
  if (c.statut === "acceptee"){
    if (!c.pushRetenu){
      if (!AMORCAGE) await envoyer([c.uid], "Tu as été retenu(e)", "Confirme la mission « " + court(c.titre) + " » pour pouvoir écrire à l'auteur.", lien);
      maj.pushRetenu = true;
    }
  } else if (c.pushRetenu){
    maj.pushRetenu = false;
    maj.pushConfirme = false;
  }
  if (c.confirmee === true && !c.pushConfirme){
    if (!AMORCAGE) await envoyer([c.auteurUid], "Mission confirmée", court(c.nom, 30) + " a confirmé la mission « " + court(c.titre) + " ».", lien);
    maj.pushConfirme = true;
  }
  if (Object.keys(maj).length) await d.ref.update(maj);
}

// ---------- Missions : validation, refus, fin de mission à confirmer ----------
const ms2 = await db.collection("missions").orderBy("createdAt", "desc").limit(300).get();
for (const d of ms2.docs){
  const m = d.data();
  const maj = {};
  const lien = SITE + "#mission=" + d.id;
  if (m.valide === true && m.valideLe){
    if (!m.pushValide){
      if (!AMORCAGE) await envoyer([m.uid], "Mission publiée", "Ta mission « " + court(m.titre) + " » a été validée et est visible par tous.", lien);
      maj.pushValide = true;
    }
  } else if (m.pushValide){ maj.pushValide = false; }
  if (m.valide === false && m.refusMotif){
    if (!m.pushRefus){
      if (!AMORCAGE) await envoyer([m.uid], "Mission refusée", "« " + court(m.titre) + " » : " + court(m.refusMotif, 90), lien);
      maj.pushRefus = true;
    }
  } else if (m.pushRefus){ maj.pushRefus = false; }
  if (m.statut === "a_confirmer"){
    if (!m.pushDeclare){
      if (!AMORCAGE){
        if (m.declarePar === "travailleur") await envoyer([m.uid], "Mission terminée ?", "Le travail « " + court(m.titre) + " » est terminé selon " + court(m.workerNom, 30) + ". Confirme-le.", lien);
        else await envoyer([m.workerUid], "Mission terminée ?", "L'auteur a confirmé la fin de « " + court(m.titre) + " ». Confirme à ton tour.", lien);
      }
      maj.pushDeclare = true;
    }
  } else if (m.pushDeclare){ maj.pushDeclare = false; }
  if (Object.keys(maj).length) await d.ref.update(maj);
}

// ---------- Nouvelles inscriptions : prévenir les administrateurs ----------
if (!AMORCAGE){
  const nouveaux = await db.collection("users").where("createdAt", ">", derniere).get();
  if (!nouveaux.empty){
    const admins = (await db.collection("admins").get()).docs.map(d => d.id);
    for (const u of nouveaux.docs.slice(0, 10)){
      const x = u.data();
      await envoyer(admins, "Nouvelle inscription", court(((x.prenom || "") + " " + (x.nom || "")).trim(), 40) + (x.ville ? " (" + x.ville + ")" : "") + " vient de rejoindre Bohicon Jobs.", SITE + "admin.html");
    }
  }
}

await etatRef.set({ derniere: Timestamp.fromMillis(MAINTENANT), maj: FieldValue.serverTimestamp(), envois: envoyes });
console.log(AMORCAGE ? "Premier passage : état initial enregistré, aucune notification envoyée." : "Terminé : " + envoyes + " notification(s) envoyée(s).");
