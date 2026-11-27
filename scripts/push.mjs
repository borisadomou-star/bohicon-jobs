// Envoi automatique des notifications push de Bohicon Jobs.
// Exécuté toutes les 5 minutes par GitHub Actions (voir push.yml).
import admin from "firebase-admin";
import nodemailer from "nodemailer";
import { courrielHtml, courrielTexte, blocsBienvenue, devisPdf, pieceLogo } from "./mailkit.mjs";

const SITE = "https://borisadomou-star.github.io/bohicon-jobs/";
const AGE_MAX = 3 * 60 * 60 * 1000;   // pas d'alerte pour un événement plus vieux que 3 h

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore();
const fcm = admin.messaging();
const { Timestamp, FieldValue } = admin.firestore;
const MAINTENANT = Date.now();
const FENETRE_30J = new Date(MAINTENANT - 30 * 24 * 3600 * 1000);

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
  transport: "Déménagement et transport", cours: "Cours et soutien scolaire", informatique: "Informatique et bureautique",
  electricite: "Électricité bâtiment", plomberie: "Plomberie et sanitaire", maconnerie: "Maçonnerie et carrelage",
  menuiserie: "Menuiserie et ébénisterie", peinture: "Peinture et finition", soudure: "Soudure et métallerie",
  mecanique: "Mécanique auto et moto", froid: "Froid et climatisation", electronique: "Électronique et dépannage",
  couture: "Couture et stylisme", coiffure: "Coiffure et esthétique", comptabilite: "Comptabilité et secrétariat",
  commerce: "Vente et commerce", securite: "Sécurité et gardiennage", agriculture: "Agriculture et élevage",
  photo: "Photo, vidéo et événementiel", sante: "Santé et soins"
};
// Si l'utilisateur n'a pas choisi de domaine, on le déduit de sa profession (et de « autre métier »)
const MOTS = {
  cuisine: ["cuisin", "traiteur", "patiss", "boulang", "restaur", "chef", "serveu", "barman"],
  livraison: ["livreur", "coursier", "zemidjan", "taxi moto"],
  transport: ["chauffeur", "demenag", "manutention", "transporteur"],
  menage: ["menag", "nettoy", "entretien"],
  jardinage: ["jardin"],
  agriculture: ["agricult", "paysan", "cultivateur", "eleveur", "maraich"],
  bricolage: ["bricol", "reparat", "homme a tout faire"],
  electricite: ["electric", "bobinag"],
  plomberie: ["plomb", "sanitaire"],
  maconnerie: ["macon", "carrel", "betonn", "chantier"],
  menuiserie: ["menuis", "ebenist", "charpent", "tapissi"],
  peinture: ["peintre", "peinture", "platr"],
  soudure: ["soud", "metallier", "ferronn", "chaudronn"],
  mecanique: ["mecanic", "garagiste", "vulcanis"],
  froid: ["frigor", "climatis", "froid"],
  electronique: ["electronic", "depann", "telephone"],
  couture: ["couturi", "styliste", "tailleur", "stylisme", "couture"],
  coiffure: ["coiffe", "coiffeu", "esthetic", "maquill", "manucure", "barbier"],
  comptabilite: ["comptab", "secretar", "gestionn", "bureaut", "assistant"],
  commerce: ["commerc", "vendeu", "boutiqu", "caissi", "revendeu"],
  securite: ["gardien", "securite", "vigile"],
  photo: ["photograph", "videast", "cameraman", "sonoris", "decorat", "animateur"],
  sante: ["infirm", "sage-femme", "aide-soignant", "aide soignant", "pharmac"],
  cours: ["enseign", "professeur", "tuteur", "instituteur", "formateur"],
  informatique: ["informat", "develop", "graphi"],
  domicile: ["nounou", "aide a domicile", "aide menager", "garde d"]
};
// Les métiers du bâtiment reçoivent aussi les missions « bricolage et réparation »
const GROUPE_BRICOLAGE = ["electricite", "plomberie", "maconnerie", "menuiserie", "peinture", "soudure", "froid", "mecanique"];
const norm = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
function domainesDe(u){
  const s = new Set(Array.isArray(u.domaines) ? u.domaines : []);
  const texte = norm((u.profession || "") + " " + (u.domaineAutre || ""));
  for (const [cat, mots] of Object.entries(MOTS)) if (mots.some(m => texte.includes(m))) s.add(cat);
  if (GROUPE_BRICOLAGE.some(c => s.has(c))) s.add("bricolage");
  return s;
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
  const pourquoi = extras.transactionnel
    ? "Tu reçois ce message car il concerne une activité en cours sur ton compte (candidature, commande, devis, message ou publication)."
    : "Tu reçois cet e-mail car les alertes par e-mail sont activées sur ton compte. Pour les désactiver : Mon espace, Profil, Domaines et formations, puis décoche « Recevoir aussi les alertes par e-mail ».";
  for (const u of profils){
    if (courriels >= PLAFOND_RUN || jourCourriels + courriels >= PLAFOND_JOUR) return;
    if (!u.email || u.suspendu || (u.alertesEmail === false && !extras.transactionnel)) continue;
    const donnees = { site: SITE, prenom: u.prenom, titre: extras.titre || sujet, intro: corps, lignes: extras.lignes, boutonTexte: extras.bouton, lien: lien || SITE, preheader: extras.preheader, blocs: extras.blocs, pourquoi };
    try {
      await transport.sendMail({
        from: '"Bohicon Jobs" <' + process.env.GMAIL_USER + ">",
        replyTo: process.env.GMAIL_USER,
        to: u.email,
        subject: extras.sujetMail || (sujet + " · Bohicon Jobs"),
        text: courrielTexte(donnees),
        html: courrielHtml(donnees),
        attachments: [pieceLogo(), ...(extras.pieces || [])]
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
const cs = await db.collection("candidatures").where("createdAt", ">", FENETRE_30J).orderBy("createdAt", "desc").limit(300).get();
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
const ms2 = await db.collection("missions").where("createdAt", ">", FENETRE_30J).orderBy("createdAt", "desc").limit(300).get();
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

// ---------- Bienvenue : présentation de Bohicon Jobs aux nouveaux inscrits ----------
const PRESENTATION = {
  intro: "Ton compte est prêt. Bohicon Jobs relie ceux qui ont besoin d'un service à ceux qui savent le rendre, à Bohicon, Abomey, Covè, Zogbodomey et Djidja. Voici tout ce que tu peux faire dès maintenant : missions, prestations, offres d'emploi et espace entreprise, gratuitement et sans commission."
};
const inscrits = await db.collection("users").where("createdAt", ">", FENETRE_30J).orderBy("createdAt", "desc").limit(200).get();
for (const d of inscrits.docs){
  const u = { id: d.id, ...d.data() };
  const maj = {};
  const recent = MAINTENANT - ms(u.createdAt) < 48 * 3600 * 1000;
  if (!u.mailBienvenue){
    if (!recent || AMORCAGE || !u.email || u.alertesEmail === false) maj.mailBienvenue = true;
    else if (transport){
      const avant = courriels;
      await courriel([u.id], "Bienvenue sur Bohicon Jobs", PRESENTATION.intro, SITE, {
        transactionnel: true, titre: "Bienvenue sur Bohicon Jobs", sujetMail: "Bienvenue sur Bohicon Jobs : découvre tout ce que tu peux faire",
        bouton: "Ouvrir Bohicon Jobs", blocs: blocsBienvenue(SITE), preheader: "Missions, prestations, emplois et espace entreprise : tout ce que tu peux faire dès maintenant."
      });
      if (courriels > avant) maj.mailBienvenue = true;
    }
  }
  if (!u.pushBienvenue){
    if (!recent || AMORCAGE) maj.pushBienvenue = true;
    else if ((await jetonsDe([u.id])).length){
      await envoyer([u.id], "Bienvenue sur Bohicon Jobs", "Publie ou trouve de petits travaux près de chez toi, en toute confiance. Découvre les missions du moment.", SITE);
      maj.pushBienvenue = true;
    }
  }
  if (Object.keys(maj).length) await d.ref.update(maj);
}

// ---------- Recrutements : e-mails et notifications à chaque étape ----------
const NIVEAUX_FR = ["Aucun diplôme exigé", "BEPC / CEP", "Baccalauréat", "Bac+2 (BTS, DUT)", "Bac+3 (Licence)", "Bac+5 (Master)", "Doctorat"];
const RECENT_RECRUT = 5 * 24 * 3600 * 1000;
const T = { transactionnel: true };

const offresSnap = await db.collection("offres").where("createdAt", ">", FENETRE_30J).orderBy("createdAt", "desc").limit(200).get();
for (const d of offresSnap.docs){
  const o = d.data();
  const maj = {};
  const recente = MAINTENANT - ms(o.createdAt) < RECENT_RECRUT;
  if (o.valide === true && !o.mailValide){
    if (recente) await notifier([o.uid], "Votre offre d'emploi est publiée", "L'offre « " + o.titre + " » a été validée : elle est maintenant visible des candidats éligibles. Vous serez prévenu(e) à chaque candidature.", SITE,
      { ...T, titre: "Offre d'emploi publiée", bouton: "Ouvrir mes recrutements", lignes: [["Poste", o.titre], ["Contrat", o.contrat || "—"], ["Ville", o.ville || "—"]] });
    maj.mailValide = true;
  }
  if (o.valide === false && o.refusMotif && !o.mailRefus){
    if (recente) await notifier([o.uid], "Votre offre d'emploi n'a pas été validée", "L'offre « " + o.titre + " » n'a pas pu être publiée. Motif : " + o.refusMotif + ". Vous pouvez la corriger et la soumettre de nouveau.", SITE,
      { ...T, titre: "Offre non validée", bouton: "Ouvrir Bohicon Jobs", lignes: [["Poste", o.titre], ["Motif", o.refusMotif]] });
    maj.mailRefus = true;
  }
  if (Object.keys(maj).length) await d.ref.update(maj);
}

const postulations = await db.collection("postulations").where("createdAt", ">", FENETRE_30J).orderBy("createdAt", "desc").limit(300).get();
for (const d of postulations.docs){
  const q = d.data();
  if (q.notifStatut === q.statut) continue;
  const recente = MAINTENANT - ms(q.createdAt) < RECENT_RECRUT;
  if (recente){
    const base = [["Poste", q.offreTitre], ["Entreprise", q.entrepriseNom || "—"]];
    const cand = [q.uid], ent = [q.entrepriseUid];
    if (q.statut === "recue"){
      await notifier(cand, "Candidature reçue", "Votre candidature au poste « " + q.offreTitre + " » chez " + q.entrepriseNom + " a bien été reçue. Vous serez informé(e) par e-mail à chaque étape du recrutement.", SITE,
        { ...T, titre: "Votre candidature a bien été reçue", bouton: "Suivre ma candidature", lignes: base.concat([["Statut", "Reçue"]]) });
      await notifier(ent, "Nouvelle candidature", (q.anonyme ? "Une candidature anonyme" : q.nom) + " a postulé au poste « " + q.offreTitre + " ». Le candidat remplit tous vos critères de sélection.", SITE,
        { ...T, titre: "Nouvelle candidature reçue", bouton: "Ouvrir le tableau de suivi", lignes: [["Poste", q.offreTitre], ["Diplôme", NIVEAUX_FR[q.niveau || 0]], ["Expérience", (q.experience || 0) + " an(s)"]] });
    } else if (q.statut === "etude"){
      await notifier(cand, "Votre dossier est en cours d'étude", "L'entreprise " + q.entrepriseNom + " étudie actuellement votre candidature au poste « " + q.offreTitre + " ».", SITE,
        { ...T, titre: "Dossier en cours d'étude", bouton: "Suivre ma candidature", lignes: base.concat([["Statut", "En étude"]]) });
    } else if (q.statut === "preselection"){
      await notifier(cand, "Vous êtes présélectionné(e)", "Bonne nouvelle : votre candidature au poste « " + q.offreTitre + " » a été présélectionnée par " + q.entrepriseNom + ".", SITE,
        { ...T, titre: "Vous êtes présélectionné(e)", bouton: "Suivre ma candidature", lignes: base.concat([["Statut", "Présélectionné(e)"]]) });
    } else if (q.statut === "entretien"){
      await notifier(cand, "Entretien programmé", q.entrepriseNom + " vous invite à un entretien pour le poste « " + q.offreTitre + " ».", SITE,
        { ...T, titre: "Entretien programmé", bouton: "Voir les détails", lignes: base.concat([["Entretien", q.entretien || "À confirmer"]]) });
    } else if (q.statut === "retenue"){
      await notifier(cand, "Candidature retenue", "Félicitations : " + q.entrepriseNom + " a retenu votre candidature pour le poste « " + q.offreTitre + " ». L'entreprise vous contactera pour la suite." + (q.messageCandidat ? " Message : " + q.messageCandidat : ""), SITE,
        { ...T, titre: "Candidature retenue", bouton: "Ouvrir Bohicon Jobs", lignes: base.concat([["Statut", "Retenu(e)"]]) });
    } else if (q.statut === "refusee"){
      await notifier(cand, "Décision concernant votre candidature", "L'entreprise " + q.entrepriseNom + " n'a pas retenu votre candidature au poste « " + q.offreTitre + " ». Par souci de transparence, le motif vous est communiqué.", SITE,
        { ...T, titre: "Décision concernant votre candidature", bouton: "Voir les offres", lignes: base.concat([["Motif", q.motif || "Non précisé"]]).concat(q.messageCandidat ? [["Message", q.messageCandidat]] : []) });
    } else if (q.statut === "retiree"){
      await notifier(ent, "Candidature retirée", (q.anonyme ? "Un candidat" : q.nom) + " a retiré sa candidature au poste « " + q.offreTitre + " ».", SITE,
        { ...T, titre: "Candidature retirée", bouton: "Ouvrir le tableau de suivi", lignes: [["Poste", q.offreTitre]] });
    }
  }
  await d.ref.update({ notifStatut: q.statut });
}

// ---------- Prestations : devis, commandes, messages, avis, validation ----------
// Ne lit que les documents modifiés depuis le dernier passage (champ « maj ») : très peu de lectures.
{
  const curseurRef = db.doc("config/prestaCurseur");
  const cur = await curseurRef.get();
  const depuis = cur.exists ? Number(cur.data().ms || 0) : MAINTENANT - 6 * 3600 * 1000;
  const fenetre = new Date(Math.max(0, depuis - 3 * 60 * 1000));
  const RECENT_P = 5 * 24 * 3600 * 1000;
  const TP = { transactionnel: true };
  const fc = n => Number(n || 0).toLocaleString("fr-FR") + " FCFA";
  const court = (t, n) => { t = String(t || ""); return t.length > n ? t.slice(0, n - 1) + "…" : t; };

  // Prestations validées ou refusées
  const pres = await db.collection("prestations").where("createdAt", ">", new Date(MAINTENANT - 45 * 24 * 3600 * 1000)).get();
  for (const d of pres.docs){
    const x = d.data(), maj = {};
    if (x.valide === true && x.valideLe && ms(x.valideLe) !== x.mailValideLe){
      if (MAINTENANT - ms(x.valideLe) < RECENT_P) await notifier([x.uid], "Votre prestation est publiée", "« " + x.titre + " » a été validée : elle est maintenant visible dans le catalogue des prestations.", SITE,
        { ...TP, titre: "Prestation publiée", bouton: "Ouvrir mes prestations", lignes: [["Prestation", x.titre], ["Prix", x.prixType === "devis" ? "Sur devis" : fc(x.prix)]] });
      maj.mailValideLe = ms(x.valideLe);
    }
    if (x.valide === false && x.refusMotif && x.refusMotif !== x.mailRefusMotif){
      await notifier([x.uid], "Votre prestation n'a pas été validée", "« " + x.titre + " » n'a pas pu être publiée. Motif : " + x.refusMotif + ". Vous pouvez la corriger puis la soumettre de nouveau.", SITE,
        { ...TP, titre: "Prestation non validée", bouton: "Ouvrir Bohicon Jobs", lignes: [["Prestation", x.titre], ["Motif", x.refusMotif]] });
      maj.mailRefusMotif = x.refusMotif;
    }
    if (Object.keys(maj).length) await d.ref.update(maj);
  }

  // Demandes de devis
  async function piecesDevis(q){
    try {
      let logoBuf = null, logoType = "jpg";
      const lg = await db.collection("logos").doc(q.prestataireUid).get();
      const m = lg.exists && typeof lg.data().data === "string" ? lg.data().data.match(/^data:image\/(jpeg|png);base64,(.+)$/) : null;
      if (m){ logoBuf = Buffer.from(m[2], "base64"); logoType = m[1] === "png" ? "png" : "jpg"; }
      const pdf = await devisPdf(q, { logoBuf, logoType, clientNom: q.clientNom });
      return [{ filename: "Devis-" + String(q.numero || q.id || "bohicon-jobs").replace(/[^A-Za-z0-9_-]/g, "") + ".pdf", content: Buffer.from(pdf), contentType: "application/pdf" }];
    } catch (e){ console.error("PDF du devis non généré :", e.message); return []; }
  }
  const devis = await db.collection("devis").where("maj", ">", fenetre).get();
  for (const d of devis.docs){
    const q = d.data();
    if (q.notifStatut === q.statut) continue;
    const base = [["Prestation", q.prestationTitre]];
    if (q.statut === "demande"){
      await notifier([q.prestataireUid], "Nouvelle demande de devis", (q.clientNom || "Un client") + " demande un devis pour « " + q.prestationTitre + " ».", SITE,
        { ...TP, titre: "Nouvelle demande de devis", bouton: "Répondre au client", lignes: base.concat([["Client", q.clientNom || "—"], ["Besoin", court(q.besoin, 160)]], q.budget ? [["Budget", fc(q.budget)]] : [], q.dateSouhaitee ? [["Date souhaitée", q.dateSouhaitee]] : []) });
    } else if (q.statut === "propose"){
      const pieces = await piecesDevis({ ...q, id: d.id });
      const finDevis = q.dateDevis ? new Date(Number(q.dateDevis) + Number(q.validiteJours || 30) * 86400000).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "";
      const lignesDevis = [["Devis", q.numero || "—"], ["Prestation", q.prestationTitre], ["Montant", fc(q.prixPropose)], ["Délai", q.delaiPropose || "À convenir"]].concat(finDevis ? [["Valable jusqu'au", finDevis]] : []);
      await notifier([q.clientUid], "Vous avez reçu un devis", (q.emetteur && q.emetteur.nom || q.prestataireNom || "Le prestataire") + " vous propose " + fc(q.prixPropose) + " pour « " + q.prestationTitre + " ». " + (pieces.length ? "Le devis est joint à cet e-mail en PDF et disponible dans votre messagerie." : "Retrouvez-le dans Mes demandes."), SITE,
        { ...TP, titre: "Vous avez reçu un devis", bouton: "Consulter et accepter le devis", pieces, lignes: lignesDevis, preheader: (q.prestataireNom || "Le prestataire") + " vous propose " + fc(q.prixPropose) + "." });
      await courriel([q.prestataireUid], "Copie de ton devis " + (q.numero || ""), "Ton devis a bien été envoyé à " + (q.clientNom || "ton client") + (pieces.length ? ". Tu trouveras une copie en pièce jointe (PDF)." : ".") + " Tu seras prévenu(e) dès que le client répond.", SITE,
        { ...TP, titre: "Ton devis a bien été envoyé", bouton: "Ouvrir mes devis", pieces, lignes: lignesDevis.concat([["Client", q.clientNom || "—"]]) });
    } else if (q.statut === "accepte"){
      await notifier([q.prestataireUid], "Devis accepté", (q.clientNom || "Le client") + " a accepté votre devis pour « " + q.prestationTitre + " ». Confirmez la commande.", SITE,
        { ...TP, titre: "Devis accepté", bouton: "Confirmer la commande", lignes: base.concat([["Montant", fc(q.prixPropose)]]) });
    } else if (q.statut === "refuse"){
      const versClient = q.refusePar === "prestataire";
      await notifier([versClient ? q.clientUid : q.prestataireUid], versClient ? "Demande de devis déclinée" : "Devis refusé",
        versClient ? "Le prestataire ne peut pas donner suite à votre demande pour « " + q.prestationTitre + " »." : (q.clientNom || "Le client") + " a refusé votre devis pour « " + q.prestationTitre + " ».", SITE,
        { ...TP, titre: versClient ? "Demande déclinée" : "Devis refusé", bouton: "Ouvrir Bohicon Jobs", lignes: base.concat(q.motif ? [["Motif", q.motif]] : []) });
    } else if (q.statut === "annule"){
      await notifier([q.prestataireUid], "Demande de devis annulée", (q.clientNom || "Le client") + " a annulé sa demande pour « " + q.prestationTitre + " ».", SITE,
        { ...TP, titre: "Demande annulée", bouton: "Ouvrir Bohicon Jobs", lignes: base });
    }
    await d.ref.update({ notifStatut: q.statut });
  }

  // Commandes
  const commandes = await db.collection("commandes").where("maj", ">", fenetre).get();
  const aRecompter = new Set();
  for (const d of commandes.docs){
    const c = d.data();
    if (c.statut === "terminee") aRecompter.add(c.prestataireUid);
    if (c.notifStatut === c.statut) continue;
    const base = [["Commande", c.titre], ["Montant", fc(c.prix)]];
    const quand = c.dateRdv ? [["Date", c.dateRdv + (c.heureRdv ? " à " + c.heureRdv : "")]] : [];
    if (c.statut === "en_attente"){
      await notifier([c.prestataireUid], "Nouvelle commande", (c.clientNom || "Un client") + " a commandé « " + c.titre + " ». Confirmez-la pour la planifier.", SITE,
        { ...TP, titre: "Nouvelle commande", bouton: "Confirmer la commande", lignes: base.concat([["Client", c.clientNom || "—"], ["Mode", c.mode === "sur_place" ? "Sur place" : "En ligne"]], quand, c.lieu ? [["Lieu", c.lieu]] : []) });
      await notifier([c.clientUid], "Commande envoyée", "Votre commande « " + c.titre + " » a été transmise à " + (c.prestataireNom || "le prestataire") + ". Vous serez prévenu(e) dès sa confirmation.", SITE,
        { ...TP, titre: "Commande envoyée", bouton: "Suivre ma commande", lignes: base.concat(quand) });
    } else if (c.statut === "confirmee"){
      await notifier([c.clientUid], "Commande confirmée", (c.prestataireNom || "Le prestataire") + " a confirmé votre commande « " + c.titre + " ».", SITE,
        { ...TP, titre: "Commande confirmée", bouton: "Suivre ma commande", lignes: base.concat(quand, c.lieu ? [["Lieu", c.lieu]] : []) });
    } else if (c.statut === "en_cours"){
      await notifier([c.clientUid], "Prestation démarrée", "Le travail sur « " + c.titre + " » a commencé.", SITE,
        { ...TP, titre: "Prestation démarrée", bouton: "Suivre ma commande", lignes: base });
    } else if (c.statut === "livree"){
      await notifier([c.clientUid], "Prestation livrée : confirmez la réception", (c.prestataireNom || "Le prestataire") + " indique avoir terminé « " + c.titre + " ». Confirmez la réception pour clôturer la commande.", SITE,
        { ...TP, titre: "Prestation livrée", bouton: "Confirmer la réception", lignes: base.concat(c.compteRendu ? [["Compte rendu", court(c.compteRendu, 200)]] : []) });
    } else if (c.statut === "terminee"){
      await notifier([c.prestataireUid], "Commande terminée", (c.clientNom || "Le client") + " a confirmé la réception de « " + c.titre + " ».", SITE,
        { ...TP, titre: "Commande terminée", bouton: "Ouvrir mes commandes", lignes: base });
      await notifier([c.clientUid], "Donnez votre avis", "Votre commande « " + c.titre + " » est terminée. Votre avis aide les autres utilisateurs.", SITE,
        { ...TP, titre: "Laissez un avis", bouton: "Donner mon avis", lignes: base });
    } else if (c.statut === "annulee"){
      const versPresta = c.annuleePar === "client";
      await notifier([versPresta ? c.prestataireUid : c.clientUid], "Commande annulée", (versPresta ? (c.clientNom || "Le client") : (c.prestataireNom || "Le prestataire")) + " a annulé la commande « " + c.titre + " ».", SITE,
        { ...TP, titre: "Commande annulée", bouton: "Ouvrir Bohicon Jobs", lignes: base.concat(c.motif ? [["Motif", c.motif]] : []) });
    } else if (c.statut === "litige"){
      await notifier([c.prestataireUid], "Un problème a été signalé", (c.clientNom || "Le client") + " a signalé un problème sur « " + c.titre + " ». Contactez-le pour trouver une solution.", SITE,
        { ...TP, titre: "Problème signalé", bouton: "Ouvrir la commande", lignes: base.concat(c.motif ? [["Problème", court(c.motif, 200)]] : []) });
    }
    await d.ref.update({ notifStatut: c.statut });
  }
  for (const uid of aRecompter){
    const n = (await db.collection("commandes").where("prestataireUid", "==", uid).where("statut", "==", "terminee").count().get()).data().count;
    await db.collection("prestataires").doc(uid).set({ nbTerminees: n }, { merge: true });
  }

  // Avis vérifiés : notification et moyennes affichées dans le catalogue
  const avis = await db.collection("avisPrestations").where("createdAt", ">", fenetre).get();
  for (const d of avis.docs){
    const a = d.data();
    if (a.mailAvis) continue;
    await notifier([a.prestataireUid], "Nouvel avis client", (a.clientNom || "Un client") + " vous a donné " + a.note + "/5." + (a.commentaire ? " « " + court(a.commentaire, 120) + " »" : ""), SITE,
      { ...TP, titre: "Nouvel avis vérifié", bouton: "Voir mes avis", lignes: [["Note", a.note + " / 5"]].concat(a.commentaire ? [["Commentaire", court(a.commentaire, 200)]] : []) });
    const moy = l => l.length ? Math.round(l.reduce((s, x) => s + Number(x.data().note || 0), 0) / l.length * 10) / 10 : 0;
    const parPrest = (await db.collection("avisPrestations").where("prestationId", "==", a.prestationId).get()).docs;
    await db.collection("prestations").doc(a.prestationId).update({ noteMoy: moy(parPrest), nbAvis: parPrest.length }).catch(() => {});
    const parProv = (await db.collection("avisPrestations").where("prestataireUid", "==", a.prestataireUid).get()).docs;
    await db.collection("prestataires").doc(a.prestataireUid).set({ noteMoy: moy(parProv), nbAvis: parProv.length }, { merge: true });
    await d.ref.update({ mailAvis: true });
  }

  // Messages : un seul courriel par série de messages, après 90 secondes
  const convs = await db.collection("conversations").where("maj", ">", fenetre).get();
  for (const d of convs.docs){
    const c = d.data();
    const dernier = Number(c.dernierMs || 0);
    if (!c.dernierDe || dernier <= Number(c.notifieMs || 0)) continue;
    if (MAINTENANT - dernier < 90 * 1000) continue;
    if (MAINTENANT - dernier < RECENT_P){
      const dest = (c.participants || []).find(u => u !== c.dernierDe);
      const nom = (c.noms && c.noms[c.dernierDe]) || "Un utilisateur";
      if (dest) await notifier([dest], "Nouveau message de " + nom, court(c.dernierTexte, 120), SITE,
        { ...TP, titre: "Nouveau message", bouton: "Lire le message", lignes: [["De", nom]].concat(c.contexte ? [["À propos de", c.contexte]] : [], [["Message", court(c.dernierTexte, 200)]]) });
    }
    await d.ref.update({ notifieMs: dernier });
  }
  await curseurRef.set({ ms: MAINTENANT });
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
