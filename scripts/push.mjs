// Envoi automatique des notifications push de Bohicon Jobs.
// Exécuté toutes les 5 minutes par GitHub Actions (voir push.yml).
import admin from "firebase-admin";
import nodemailer from "nodemailer";

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

// ---------- E-mails (Gmail) : facultatif, actif seulement si les deux secrets existent ----------
const MOT_DE_PASSE = String(process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "");
const transport = process.env.GMAIL_USER && MOT_DE_PASSE
  ? nodemailer.createTransport({ service: "gmail", auth: { user: process.env.GMAIL_USER, pass: MOT_DE_PASSE } })
  : null;
const AUJOURDHUI = new Date().toISOString().slice(0, 10);
const jourCourriels = etat.exists && etat.data().jourMails === AUJOURDHUI ? Number(etat.data().mailsJour || 0) : 0;
const PLAFOND_RUN = 80;      // e-mails maximum par passage
const PLAFOND_JOUR = 450;    // limite de sécurité (Gmail : environ 500 par jour)
let courriels = 0;

const ms = t => (t && typeof t.toMillis === "function" ? t.toMillis() : 0);

// ---------- Alertes ciblées : missions de mon domaine ----------
const CATEGORIES = {
  menage: "Ménage et nettoyage", livraison: "Livraison et courses", jardinage: "Jardinage et extérieur",
  bricolage: "Bricolage et réparation", cuisine: "Cuisine et événements", domicile: "Aide à domicile",
  transport: "Déménagement et transport", cours: "Cours et soutien scolaire", informatique: "Informatique et bureautique"
};
// Si l'utilisateur n'a pas choisi de domaine, on le déduit de sa profession
const MOTS = {
  cuisine: ["cuisin", "traiteur", "patiss", "boulang", "restaur", "chef", "serveu", "barman"],
  livraison: ["livreur", "coursier", "zemidjan", "taxi moto"],
  transport: ["chauffeur", "demenag", "manutention", "transporteur"],
  menage: ["menag", "nettoy", "entretien"],
  jardinage: ["jardin", "agricult", "paysan", "cultivateur", "eleveur"],
  bricolage: ["plomb", "electric", "macon", "menuis", "soudeur", "peintre", "mecanic", "carreleur", "bricol"],
  cours: ["enseign", "professeur", "tuteur", "instituteur", "formateur"],
  informatique: ["informat", "develop", "comptab", "secretar", "bureaut", "graphi"],
  domicile: ["nounou", "aide a domicile", "aide menager", "infirm", "aide-soignant", "aide soignant", "garde d"]
};
const norm = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
function domainesDe(u){
  const s = new Set(Array.isArray(u.domaines) ? u.domaines : []);
  const prof = norm(u.profession);
  for (const [cat, mots] of Object.entries(MOTS)) if (mots.some(m => prof.includes(m))) s.add(cat);
  return s;
}
const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function courrielHtml({ prenom, titre, intro, lignes, bouton, lien }){
  const carte = (lignes || []).length
    ? '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 6px;background:#f5faf7;border-left:4px solid #12995a;border-radius:10px"><tr><td style="padding:14px 16px">'
      + lignes.map(([k, v]) => '<div style="margin:0 0 6px;font-size:14px;line-height:1.5;color:#33463b"><span style="color:#6b7c72">' + esc(k) + ' : </span><strong style="color:#12261b">' + esc(v) + '</strong></div>').join("")
      + "</td></tr></table>"
    : "";
  return '<div style="margin:0;padding:24px 12px;background:#f1f5f2;font-family:Segoe UI,Helvetica,Arial,sans-serif">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e4ede7;border-radius:20px;overflow:hidden">'
    + '<tr><td style="padding:22px 24px;background:#0a5a32;background-image:linear-gradient(135deg,#062f1b,#0f7a45)">'
    + '<table role="presentation" cellpadding="0" cellspacing="0"><tr>'
    + '<td width="46" height="46" align="center" style="width:46px;height:46px;border-radius:12px;background:#12995a;color:#ffffff;font-size:18px;font-weight:700">BJ</td>'
    + '<td style="padding-left:12px;color:#ffffff;font-size:18px;font-weight:700;line-height:1.3">Bohicon Jobs<br><span style="font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#fcd116;font-weight:600">Les opportunités à portée de main</span></td>'
    + "</tr></table></td></tr>"
    + '<tr><td style="padding:26px 24px 10px">'
    + '<h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#12261b">' + esc(titre) + "</h1>"
    + '<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#33463b">' + (prenom ? "Bonjour " + esc(prenom) + ",<br>" : "") + esc(intro) + "</p>"
    + carte
    + '<a href="' + esc(lien) + '" style="display:inline-block;margin:16px 0 8px;padding:13px 26px;background:#0b6b3a;color:#ffffff;border-radius:999px;font-size:15px;font-weight:700;text-decoration:none">' + esc(bouton || "Ouvrir Bohicon Jobs") + "</a>"
    + "</td></tr>"
    + '<tr><td style="padding:16px 24px 24px;border-top:1px solid #edf3ef;font-size:12px;line-height:1.6;color:#6b7c72">'
    + "Tu reçois cet e-mail parce que tu as un compte sur Bohicon Jobs. Pour ne plus en recevoir : Mon espace, Profil, Domaines et formations, puis décoche « Recevoir aussi les alertes par e-mail »."
    + "</td></tr></table></div>";
}

async function usersParIds(ids){
  if (tousUsers){
    const index = new Map(tousUsers.map(u => [u.id, u]));
    return ids.map(i => index.get(i)).filter(Boolean);
  }
  const sortie = [];
  for (let i = 0; i < ids.length; i += 50){
    const docs = await db.getAll(...ids.slice(i, i + 50).map(id => db.collection("users").doc(id)));
    docs.forEach(d => { if (d.exists) sortie.push({ id: d.id, ...d.data() }); });
  }
  return sortie;
}

async function courriel(uids, sujet, corps, lien, extras = {}){
  if (!transport) return;
  const ids = [...new Set(uids.filter(Boolean))];
  if (!ids.length) return;
  const profils = await usersParIds(ids);
  for (const u of profils){
    if (courriels >= PLAFOND_RUN || jourCourriels + courriels >= PLAFOND_JOUR) return;
    if (!u.email || u.suspendu || u.alertesEmail === false) continue;
    const donnees = { prenom: u.prenom, titre: sujet, intro: corps, lignes: extras.lignes, bouton: extras.bouton, lien: lien || SITE };
    try {
      await transport.sendMail({
        from: '"Bohicon Jobs" <' + process.env.GMAIL_USER + ">",
        to: u.email,
        subject: sujet + " · Bohicon Jobs",
        text: (u.prenom ? "Bonjour " + u.prenom + ",\n\n" : "") + corps + "\n\n" + (lien || SITE),
        html: courrielHtml(donnees)
      });
      courriels++;
    } catch (e){ console.error("E-mail non envoyé :", e.message); }
  }
}

// Notification push + e-mail
async function notifier(uids, titre, corps, lien, extras){
  await envoyer(uids, titre, corps, lien);
  await courriel(uids, titre, corps, lien, extras);
}

let tousUsers = null;
async function utilisateurs(){
  if (!tousUsers){
    const s = await db.collection("users").limit(2000).get();
    tousUsers = s.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  return tousUsers;
}
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
      await notifier([c.auteurUid], "Nouvelle candidature", court(c.nom, 30) + " s'est proposé(e) pour « " + court(c.titre) + " ».", lien);
    }
    maj.pushAuteur = true;
  }
  if (c.statut === "acceptee"){
    if (!c.pushRetenu){
      if (!AMORCAGE) await notifier([c.uid], "Tu as été retenu(e)", "Confirme la mission « " + court(c.titre) + " » pour pouvoir écrire à l'auteur.", lien);
      maj.pushRetenu = true;
    }
  } else if (c.pushRetenu){
    maj.pushRetenu = false;
    maj.pushConfirme = false;
  }
  if (c.confirmee === true && !c.pushConfirme){
    if (!AMORCAGE) await notifier([c.auteurUid], "Mission confirmée", court(c.nom, 30) + " a confirmé la mission « " + court(c.titre) + " ».", lien);
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
      if (!AMORCAGE) await notifier([m.uid], "Mission publiée", "Ta mission « " + court(m.titre) + " » a été validée et est visible par tous.", lien);
      maj.pushValide = true;
    }
  } else if (m.pushValide){ maj.pushValide = false; }
  if (m.valide === false && m.refusMotif){
    if (!m.pushRefus){
      if (!AMORCAGE) await notifier([m.uid], "Mission refusée", "« " + court(m.titre) + " » : " + court(m.refusMotif, 90), lien);
      maj.pushRefus = true;
    }
  } else if (m.pushRefus){ maj.pushRefus = false; }
  // Alertes de domaine : les profils formés sont prévenus en premier, les autres un peu plus tard
  const publique = m.statut === "disponible" && m.valide !== false && CATEGORIES[m.categorie];
  if (publique && (!m.pushDom1 || !m.pushDom2)){
    const t0 = ms(m.valideLe) || ms(m.createdAt);
    const recente = MAINTENANT - t0 < 24 * 3600 * 1000;
    if (!recente || AMORCAGE){
      maj.pushDom1 = true; maj.pushDom2 = true;
    } else {
      const libre = u => u.id !== m.uid && !u.suspendu && u.alertes !== false;
      const titreAlerte = "Nouvelle mission dans ton domaine";
      const infos = court(m.titre, 50) + " · " + CATEGORIES[m.categorie] + " · " + (m.ville || "") + " · " + Number(m.prix || 0).toLocaleString("fr-FR") + " FCFA";
      const extrasMission = { bouton: "Voir la mission", lignes: [["Mission", m.titre], ["Domaine", CATEGORIES[m.categorie]], ["Ville", m.ville || "—"], ["Rémunération", Number(m.prix || 0).toLocaleString("fr-FR") + " FCFA"]] };
      const tous = await utilisateurs();
      const formes = tous.filter(u => libre(u) && u.formations && u.formations[m.categorie]);
      if (!m.pushDom1){
        if (formes.length) await notifier(formes.slice(0, 150).map(u => u.id), titreAlerte, infos + ". Ta formation correspond : tu es prioritaire.", lien, extrasMission);
        maj.pushDom1 = true;
      }
      if (!m.pushDom2 && MAINTENANT - t0 >= 15 * 60 * 1000){
        const dejaFormes = new Set(formes.map(u => u.id));
        const interesses = tous.filter(u => libre(u) && !dejaFormes.has(u.id) && domainesDe(u).has(m.categorie));
        if (interesses.length) await notifier(interesses.slice(0, 150).map(u => u.id), titreAlerte, infos + ".", lien, extrasMission);
        maj.pushDom2 = true;
      }
    }
  }
  if (m.statut === "a_confirmer"){
    if (!m.pushDeclare){
      if (!AMORCAGE){
        if (m.declarePar === "travailleur") await notifier([m.uid], "Mission terminée ?", "Le travail « " + court(m.titre) + " » est terminé selon " + court(m.workerNom, 30) + ". Confirme-le.", lien);
        else await notifier([m.workerUid], "Mission terminée ?", "L'auteur a confirmé la fin de « " + court(m.titre) + " ». Confirme à ton tour.", lien);
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

await etatRef.set({ derniere: Timestamp.fromMillis(MAINTENANT), maj: FieldValue.serverTimestamp(), envois: envoyes, courriels, jourMails: AUJOURDHUI, mailsJour: jourCourriels + courriels });
console.log(AMORCAGE ? "Premier passage : état initial enregistré, aucune notification envoyée." : "Terminé : " + envoyes + " notification(s) push et " + courriels + " e-mail(s) envoyé(s)." + (transport ? "" : " (e-mails désactivés : secrets Gmail absents)"));
