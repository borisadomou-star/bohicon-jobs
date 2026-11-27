// ===== Bohicon Jobs : e-mails professionnels et devis PDF (aucune dépendance sauf pdf-lib) =====
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const LOGO_JPG_B64 = "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";
export const LOGO_BUF = Buffer.from(LOGO_JPG_B64, "base64");
export const LOGO_CID = "logo-bohicon@bohiconjobs";
export const pieceLogo = () => ({ filename: "bohicon-jobs.jpg", content: LOGO_BUF, cid: LOGO_CID, contentType: "image/jpeg", contentDisposition: "inline" });

export const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const fmt = (n, sep = "\u00a0") => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
export const fcfa = n => fmt(n) + "\u00a0FCFA";

// ---------- calcul d'un devis (identique à celui de l'application) ----------
export function normaliserDevis(d){
  if (Array.isArray(d.lignes) && d.lignes.length) return d;
  // devis établi avant l'éditeur détaillé : une seule ligne au montant proposé
  return { ...d, lignes: [{ d: d.prestationTitre || "Prestation", q: 1, pu: Number(d.prixPropose || 0) }] };
}
export function calculDevis(d0){
  const d = normaliserDevis(d0);
  const lignes = Array.isArray(d.lignes) ? d.lignes : [];
  const st = lignes.reduce((s, l) => s + Math.round(Number(l.q || 0) * Number(l.pu || 0)), 0);
  const remise = Math.min(st, Math.max(0, Math.round(Number(d.remise || 0))));
  const ht = st - remise;
  const taux = Number(d.tvaTaux || 0);
  const tva = Math.round(ht * taux / 100);
  const ttc = ht + tva;
  const acompte = Math.round(ttc * Number(d.acomptePct || 0) / 100);
  return { st, remise, ht, taux, tva, ttc, acompte, reste: ttc - acompte };
}

// =====================================================================
//  E-MAILS
// =====================================================================
const POLICE = "'Segoe UI',Helvetica,Arial,sans-serif";
const C = { vert: "#0b6b3a", nuit: "#041a0f", or: "#f2c230", orClair: "#fcd116", encre: "#12261b", texte: "#33463b", gris: "#6b7c72", fond: "#eef3f0", trait: "#e4ede7", carte: "#f5faf7" };

function paragraphes(t){
  return String(t || "").split(/\n\n+/).filter(Boolean).map(p =>
    '<p style="margin:0 0 14px;font-family:' + POLICE + ';font-size:15px;line-height:1.65;color:' + C.texte + '">' + esc(p).replace(/\n/g, "<br>") + "</p>").join("");
}
function tableauLignes(lignes, longues){
  if (!lignes || !lignes.length) return "";
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;background:' + C.carte + ';border:1px solid ' + C.trait + ';border-left:4px solid ' + C.vert + ';border-radius:12px">'
    + lignes.map(([k, v], i) => '<tr><td style="padding:' + (i === 0 ? "14px" : "6px") + ' 8px ' + (i === lignes.length - 1 ? "14px" : "6px") + ' 16px;font-family:' + POLICE + ';font-size:13px;color:' + C.gris + ';width:34%;vertical-align:top">' + esc(k)
      + '</td><td style="padding:' + (i === 0 ? "14px" : "6px") + ' 16px ' + (i === lignes.length - 1 ? "14px" : "6px") + ' 8px;font-family:' + POLICE + ';font-size:14px;font-weight:' + (longues ? '400' : '600') + ';color:' + C.encre + ';line-height:1.5;vertical-align:top">' + esc(v) + "</td></tr>").join("")
    + "</table>";
}
function bouton(texte, lien){
  return '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 4px"><tr><td align="center" bgcolor="' + C.vert + '" style="border-radius:999px;background:linear-gradient(135deg,#0b6b3a,#12995a)">'
    + '<a href="' + esc(lien) + '" style="display:inline-block;padding:14px 32px;font-family:' + POLICE + ';font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px">' + esc(texte) + "</a></td></tr></table>";
}

export function courrielHtml({ site, prenom, titre, intro, lignes, boutonTexte, lien, preheader, blocs, pourquoi }){
  const lienPrincipal = lien || site;
  const logo = '<img src="cid:' + LOGO_CID + '" width="56" height="56" alt="Bohicon Jobs" style="display:block;width:56px;height:56px;border:0;border-radius:14px">';
  return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>' + esc(titre) + "</title></head>"
    + '<body style="margin:0;padding:0;background:' + C.fond + '" bgcolor="' + C.fond + '">'
    + '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px">' + esc(preheader || intro || titre) + "&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>"
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="' + C.fond + '"><tr><td align="center" style="padding:26px 12px">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:22px;overflow:hidden;border:1px solid ' + C.trait + '">'
    // en-tête de marque
    + '<tr><td bgcolor="' + C.nuit + '" style="padding:26px 30px;background:' + C.nuit + ';background-image:linear-gradient(135deg,#041a0f 0%,#07391f 55%,#0a5a32 100%)">'
    + '<table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="56" style="width:56px">' + logo + "</td>"
    + '<td style="padding-left:16px;vertical-align:middle"><div style="font-family:' + POLICE + ';font-size:22px;font-weight:700;color:#ffffff;line-height:1.2">Bohicon <span style="color:' + C.orClair + '">Jobs</span></div>'
    + '<div style="margin-top:4px;font-family:' + POLICE + ';font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:' + C.or + '">Les opportunités à portée de main</div></td></tr></table></td></tr>'
    + '<tr><td height="4" bgcolor="' + C.or + '" style="height:4px;font-size:0;line-height:0;background:linear-gradient(90deg,#f2c230,#fff0a0,#f2c230)">&nbsp;</td></tr>'
    // corps
    + '<tr><td style="padding:34px 30px 10px">'
    + '<h1 style="margin:0 0 16px;font-family:' + POLICE + ';font-size:24px;line-height:1.25;font-weight:700;color:' + C.encre + '">' + esc(titre) + "</h1>"
    + (prenom ? '<p style="margin:0 0 14px;font-family:' + POLICE + ';font-size:15px;line-height:1.65;color:' + C.texte + '">Bonjour <strong>' + esc(prenom) + "</strong>,</p>" : "")
    + paragraphes(intro)
    + tableauLignes(lignes)
    + (blocs || "")
    + (boutonTexte ? bouton(boutonTexte, lienPrincipal) : "")
    + (boutonTexte ? '<p style="margin:10px 0 0;font-family:' + POLICE + ';font-size:12px;line-height:1.5;color:' + C.gris + '">Si le bouton ne s\'ouvre pas, copie ce lien dans ton navigateur :<br><a href="' + esc(lienPrincipal) + '" style="color:' + C.vert + ';word-break:break-all">' + esc(lienPrincipal) + "</a></p>" : "")
    + "</td></tr>"
    // pied de page
    + '<tr><td style="padding:26px 30px 8px"><div style="border-top:1px solid ' + C.trait + ';height:1px;font-size:0;line-height:0">&nbsp;</div></td></tr>'
    + '<tr><td style="padding:6px 30px 28px;font-family:' + POLICE + ';font-size:12px;line-height:1.7;color:' + C.gris + '">'
    + '<div style="margin-bottom:8px;font-size:13px;color:' + C.encre + '"><strong>Bohicon Jobs</strong> · Bohicon, Abomey, Covè, Zogbodomey et Djidja (Bénin)</div>'
    + '<div style="margin-bottom:10px"><a href="' + esc(site) + '" style="color:' + C.vert + ';text-decoration:none;font-weight:600">Ouvrir l\'application</a> &nbsp;·&nbsp; <a href="' + esc(site) + 'confidentialite.html" style="color:' + C.vert + ';text-decoration:none;font-weight:600">Confidentialité et conditions</a></div>'
    + "<div>" + esc(pourquoi || "Tu reçois ce message parce que tu as un compte sur Bohicon Jobs.") + "</div>"
    + "<div style=\"margin-top:8px\">Une question ? Réponds simplement à cet e-mail, ou utilise « Donner mon avis » dans l'application. Gratuit et sans commission : les paiements se font directement entre utilisateurs.</div>"
    + "</td></tr></table>"
    + '<div style="max-width:600px;margin:14px auto 0;font-family:' + POLICE + ';font-size:11px;color:#8a9a91;text-align:center">© Bohicon Jobs · Tous droits réservés</div>'
    + "</td></tr></table></body></html>";
}

export function courrielTexte({ site, prenom, titre, intro, lignes, boutonTexte, lien, extra, pourquoi }){
  return (prenom ? "Bonjour " + prenom + ",\n\n" : "") + titre + "\n\n" + String(intro || "")
    + ((lignes || []).length ? "\n\n" + lignes.map(([k, v]) => "- " + k + " : " + v).join("\n") : "")
    + (extra ? "\n\n" + extra : "")
    + "\n\n" + (boutonTexte ? boutonTexte + " : " : "") + (lien || site)
    + "\n\n--\nBohicon Jobs · Bohicon, Bénin\n" + (pourquoi || "Tu reçois ce message parce que tu as un compte sur Bohicon Jobs.") + "\nConfidentialité : " + site + "confidentialite.html";
}

// ---------- e-mail de bienvenue : toutes les informations et fonctionnalités ----------
function titreSection(t){
  return '<h2 style="margin:26px 0 12px;font-family:' + POLICE + ';font-size:17px;line-height:1.3;font-weight:700;color:' + C.encre + '">' + esc(t) + "</h2>";
}
function carteUnivers(num, couleur, titre, accroche, puces){
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;background:#ffffff;border:1px solid ' + C.trait + ';border-radius:16px">'
    + '<tr><td width="6" bgcolor="' + couleur + '" style="width:6px;background:' + couleur + ';border-radius:16px 0 0 16px;font-size:0;line-height:0">&nbsp;</td>'
    + '<td style="padding:16px 18px"><div style="font-family:' + POLICE + ';font-size:16px;font-weight:700;color:' + C.encre + '">' + esc(titre) + "</div>"
    + '<div style="margin:2px 0 8px;font-family:' + POLICE + ';font-size:13px;color:' + C.gris + '">' + esc(accroche) + "</div>"
    + '<table role="presentation" cellpadding="0" cellspacing="0">' + puces.map(p => '<tr><td valign="top" style="padding:3px 8px 3px 0;font-family:' + POLICE + ';font-size:14px;color:' + couleur + ';line-height:1.5">&#9679;</td><td style="padding:3px 0;font-family:' + POLICE + ';font-size:14px;line-height:1.55;color:' + C.texte + '">' + esc(p) + "</td></tr>").join("") + "</table>"
    + "</td></tr></table>";
}
function etape(n, t, d){
  return '<tr><td valign="top" style="padding:0 12px 12px 0;width:34px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" width="30" height="30" bgcolor="' + C.vert + '" style="width:30px;height:30px;border-radius:15px;background:' + C.vert + ';font-family:' + POLICE + ';font-size:14px;font-weight:700;color:#ffffff">' + n + "</td></tr></table></td>"
    + '<td valign="top" style="padding:3px 0 12px;font-family:' + POLICE + ';font-size:14px;line-height:1.55;color:' + C.texte + '"><strong style="color:' + C.encre + '">' + esc(t) + "</strong><br>" + esc(d) + "</td></tr>";
}
export function blocsBienvenue(site){
  return titreSection("Bohicon Jobs en un coup d'œil")
    + carteUnivers(1, "#12995a", "Missions", "Un besoin ? Un coup de main à donner ?", [
      "Publie une mission (titre, lieu, prix, date) : notre équipe la vérifie avant de la rendre visible.",
      "Parcours les missions près de chez toi, propose-toi et suis tes candidatures.",
      "Le contact WhatsApp n'est partagé qu'après confirmation, et chacun note l'autre à la fin.",
      "Reçois des alertes (notification et e-mail) pour les missions de tes domaines."])
    + carteUnivers(2, "#d99a00", "Prestations", "Des services en ligne et sur place", [
      "Un catalogue avec recherche et filtres : graphisme, informatique, plomberie, électricité, formation, couture…",
      "Demande un devis, commande ou réserve un créneau, suis chaque étape et échange par messagerie.",
      "Prestataire : publie tes services, montre ton portfolio, envoie des devis professionnels en PDF et gère ton agenda d'interventions.",
      "Des avis vérifiés, publiés uniquement après une commande terminée."])
    + carteUnivers(3, "#2f6fed", "Emplois", "Un recrutement clair et équitable", [
      "Renseigne ton profil professionnel : niveau d'études, diplôme, expérience et compétences.",
      "Chaque offre affiche ses critères et le site vérifie ton éligibilité avant que tu postules.",
      "Suivi transparent de ta candidature, e-mail à chaque étape et refus toujours motivé."])
    + carteUnivers(4, "#7c3aed", "Espace entreprise", "Ton poste de travail professionnel", [
      "Tableau de bord, modèles de missions, recrutements, prestations et messagerie au même endroit.",
      "Fiche entreprise avec logo et badge « Entreprise vérifiée » pour inspirer confiance.",
      "Un bouton « Entreprises » en haut à droite de l'application pour y accéder."])
    + titreSection("Tes premiers pas")
    + '<table role="presentation" cellpadding="0" cellspacing="0" width="100%">'
    + etape(1, "Complète ton profil", "Ajoute une photo, ton numéro WhatsApp et ta ville : un profil complet inspire confiance.")
    + etape(2, "Choisis tes domaines", "Indique tes métiers et formations pour recevoir les missions qui te correspondent.")
    + etape(3, "Installe l'application", "Android : menu ⋮ puis « Ajouter à l'écran d'accueil ». iPhone : bouton Partager puis « Sur l'écran d'accueil ».")
    + etape(4, "Lance-toi", "Publie une mission, propose une prestation ou postule à une offre d'emploi.")
    + "</table>"
    + titreSection("Ta confiance, notre priorité")
    + tableauLignes([
      ["Gratuit", "Aucun abonnement, aucune commission : les paiements se font directement entre utilisateurs."],
      ["Contenus vérifiés", "Missions, offres et prestations sont validées par notre équipe avant publication."],
      ["Avis vérifiés", "Une note n'est possible qu'après une mission ou une commande réellement terminée."],
      ["Données protégées", "Ton mot de passe n'est jamais visible, et tes messages ne sont lus que par ton interlocuteur."],
      ["Prudence", "Ne verse jamais d'argent d'avance à quelqu'un que tu ne connais pas, et précise le prix et le délai avant de commencer."]], true);
}

// =====================================================================
//  DEVIS PDF
// =====================================================================
const AUTORISES = new Set([8216, 8217, 8220, 8221, 8230, 8211, 8212, 8226, 8364]);
export function san(s){
  return String(s == null ? "" : s).replace(/[\u00a0\u202f\u2009]/g, " ").replace(/\r/g, "").split("").map(ch => {
    const c = ch.charCodeAt(0);
    if (ch === "\n") return ch;
    if (c < 32) return "";
    if (c <= 255 || AUTORISES.has(c)) return ch;
    return "?";
  }).join("");
}
const g = (r, gr, b) => rgb(r / 255, gr / 255, b / 255);
const K = { vert: g(11, 107, 58), vertClair: g(231, 245, 237), encre: g(18, 38, 27), texte: g(51, 70, 59), gris: g(107, 124, 114), trait: g(222, 232, 226), or: g(242, 194, 48), blanc: g(255, 255, 255), fond: g(246, 250, 248) };

function envelopper(police, taille, texte, largeur){
  const sortie = [];
  String(texte || "").split("\n").forEach(par => {
    const mots = par.split(/\s+/).filter(Boolean);
    let ligne = "";
    if (!mots.length){ sortie.push(""); return; }
    mots.forEach(m => {
      const essai = ligne ? ligne + " " + m : m;
      if (police.widthOfTextAtSize(essai, taille) <= largeur) ligne = essai;
      else {
        if (ligne) sortie.push(ligne);
        let reste = m;
        while (police.widthOfTextAtSize(reste, taille) > largeur && reste.length > 1){
          let n = reste.length - 1;
          while (n > 1 && police.widthOfTextAtSize(reste.slice(0, n), taille) > largeur) n--;
          sortie.push(reste.slice(0, n)); reste = reste.slice(n);
        }
        ligne = reste;
      }
    });
    if (ligne) sortie.push(ligne);
  });
  return sortie;
}

// d : devis ; opt : { logoBuf, logoType ("jpg"|"png"), clientNom }
export async function devisPdf(d0, opt = {}){
  const d = normaliserDevis(d0);
  const pdf = await PDFDocument.create();
  const em = d.emetteur || {};
  pdf.setTitle("Devis " + (d.numero || ""));
  pdf.setAuthor(san(em.nom || "Bohicon Jobs"));
  pdf.setCreator("Bohicon Jobs");
  pdf.setProducer("Bohicon Jobs");
  const fR = await pdf.embedFont(StandardFonts.Helvetica);
  const fB = await pdf.embedFont(StandardFonts.HelveticaBold);
  let logo = null;
  try { logo = opt.logoType === "png" ? await pdf.embedPng(opt.logoBuf) : await pdf.embedJpg(opt.logoBuf); } catch (e) { logo = null; }
  if (!logo){ try { logo = await pdf.embedJpg(LOGO_BUF); } catch (e) { logo = null; } }

  const W = 595.28, H = 841.89, M = 42;
  let page, y, numPage = 0;
  const Y = v => H - v;
  const txt = (s, x, top, o = {}) => {
    const font = o.gras ? fB : fR, size = o.taille || 10, t = san(s);
    const w = font.widthOfTextAtSize(t, size);
    const px = o.align === "right" ? x - w : o.align === "center" ? x - w / 2 : x;
    page.drawText(t, { x: px, y: Y(top) - size * 0.78, size, font, color: o.couleur || K.texte });
    return w;
  };
  const rect = (x, top, w, h, couleur, o = {}) => page.drawRectangle({ x, y: Y(top) - h, width: w, height: h, color: couleur, borderColor: o.bord, borderWidth: o.bord ? (o.epaisseur || .8) : 0 });
  const ligneH = (top, x1 = M, x2 = W - M, couleur = K.trait, ep = .8) => page.drawLine({ start: { x: x1, y: Y(top) }, end: { x: x2, y: Y(top) }, thickness: ep, color: couleur });
  const pied = () => {
    ligneH(H - 52);
    txt("Devis établi via Bohicon Jobs. Le paiement s'effectue directement entre le client et le prestataire ; Bohicon Jobs ne perçoit aucune commission.", W / 2, H - 44, { taille: 7.5, couleur: K.gris, align: "center" });
    txt("Page " + numPage, W - M, H - 30, { taille: 7.5, couleur: K.gris, align: "right" });
    txt(san(d.numero || ""), M, H - 30, { taille: 7.5, couleur: K.gris });
  };
  const nouvellePage = () => { page = pdf.addPage([W, H]); numPage++; y = M; pied(); };
  const place = h => { if (y + h > H - 70) { nouvellePage(); entete(true); } };

  const entete = repete => {
    if (repete){ txt("DEVIS " + (d.numero || ""), W - M, y, { gras: true, taille: 12, couleur: K.vert, align: "right" }); y += 26; return; }
    // bandeau supérieur
    rect(0, 0, W, 8, K.vert);
    rect(0, 8, W, 2.2, K.or);
    y = M + 8;
    let xTexte = M;
    if (logo){
      const s = Math.min(58 / logo.width, 58 / logo.height);
      page.drawImage(logo, { x: M, y: Y(y) - logo.height * s, width: logo.width * s, height: logo.height * s });
      xTexte = M + logo.width * s + 14;
    }
    let ty = y + 2;
    const nom = em.nom || "Prestataire";
    envelopper(fB, 15, san(nom), 270).slice(0, 2).forEach(l => { txt(l, xTexte, ty, { gras: true, taille: 15, couleur: K.encre }); ty += 18; });
    [em.adresse, em.tel ? "Tél. : " + em.tel : "", em.email, em.ifu ? "IFU / RCCM : " + em.ifu : ""].filter(Boolean).forEach(l => {
      envelopper(fR, 9, san(l), 260).slice(0, 2).forEach(x => { txt(x, xTexte, ty, { taille: 9, couleur: K.gris }); ty += 12; });
    });
    // titre et références
    txt("DEVIS", W - M, y - 2, { gras: true, taille: 30, couleur: K.vert, align: "right" });
    let ry = y + 38;
    const dateD = d.dateDevis ? new Date(Number(d.dateDevis)) : new Date();
    const fr = x => x.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
    txt("N° " + (d.numero || ""), W - M, ry, { gras: true, taille: 11, couleur: K.encre, align: "right" }); ry += 15;
    txt("Date : " + fr(dateD), W - M, ry, { taille: 9.5, align: "right" }); ry += 13;
    const fin = new Date(dateD.getTime() + Number(d.validiteJours || 30) * 86400000);
    txt("Valable jusqu'au " + fr(fin), W - M, ry, { taille: 9.5, align: "right" });
    y = Math.max(ty, ry + 14) + 10;
    ligneH(y); y += 16;
    // destinataire et objet
    const colW = (W - 2 * M - 16) / 2;
    rect(M, y, colW, 94, K.fond, { bord: K.trait });
    rect(M + colW + 16, y, colW, 94, K.fond, { bord: K.trait });
    txt("DESTINATAIRE", M + 12, y + 10, { gras: true, taille: 7.5, couleur: K.vert });
    txt(opt.clientNom || d.clientNom || "Client", M + 12, y + 24, { gras: true, taille: 11.5, couleur: K.encre });
    txt("Besoin exprimé :", M + 12, y + 44, { taille: 8.5, couleur: K.gris });
    envelopper(fR, 8.5, san(d.besoin || ""), colW - 24).slice(0, 3).forEach((l, i) => txt(l, M + 12, y + 56 + i * 11, { taille: 8.5 }));
    txt("OBJET", M + colW + 28, y + 10, { gras: true, taille: 7.5, couleur: K.vert });
    envelopper(fB, 11, san(d.prestationTitre || ""), colW - 24).slice(0, 3).forEach((l, i) => txt(l, M + colW + 28, y + 24 + i * 14, { gras: true, taille: 11, couleur: K.encre }));
    if (d.delaiPropose) txt("Délai de réalisation : " + d.delaiPropose, M + colW + 28, y + 70, { taille: 8.5, couleur: K.gris });
    y += 94 + 22;
  };

  nouvellePage();
  entete(false);

  // tableau des lignes
  const cx = { desc: M + 10, q: M + 330, pu: M + 420, tot: W - M - 10 };
  const enteteTableau = () => {
    rect(M, y, W - 2 * M, 24, K.vert);
    txt("Désignation", cx.desc, y + 8, { gras: true, taille: 9, couleur: K.blanc });
    txt("Qté", cx.q, y + 8, { gras: true, taille: 9, couleur: K.blanc, align: "right" });
    txt("Prix unitaire", cx.pu, y + 8, { gras: true, taille: 9, couleur: K.blanc, align: "right" });
    txt("Total", cx.tot, y + 8, { gras: true, taille: 9, couleur: K.blanc, align: "right" });
    y += 24;
  };
  enteteTableau();
  (d.lignes || []).forEach((l, i) => {
    const lignesDesc = envelopper(fR, 10, san(l.d || ""), 300);
    const h = Math.max(24, lignesDesc.length * 13 + 12);
    if (y + h > H - 70){ nouvellePage(); entete(true); enteteTableau(); }
    if (i % 2 === 0) rect(M, y, W - 2 * M, h, K.fond);
    lignesDesc.forEach((x, k) => txt(x, cx.desc, y + 8 + k * 13, { taille: 10, couleur: K.encre }));
    txt(String(Number(l.q || 0)).replace(".", ","), cx.q, y + 8, { taille: 10, align: "right" });
    txt(fmt(l.pu, " "), cx.pu, y + 8, { taille: 10, align: "right" });
    txt(fmt(Math.round(Number(l.q || 0) * Number(l.pu || 0)), " "), cx.tot, y + 8, { gras: true, taille: 10, align: "right", couleur: K.encre });
    y += h;
  });
  ligneH(y, M, W - M, K.trait, 1);
  y += 16;

  // totaux
  const t = calculDevis(d);
  const lignesT = [["Sous-total", fmt(t.st, " ") + " FCFA"]];
  if (t.remise) lignesT.push(["Remise", "- " + fmt(t.remise, " ") + " FCFA"]);
  if (t.taux){ lignesT.push(["Total HT", fmt(t.ht, " ") + " FCFA"]); lignesT.push(["TVA " + t.taux + " %", fmt(t.tva, " ") + " FCFA"]); }
  place(lignesT.length * 17 + 80);
  const bx = W - M - 250;
  lignesT.forEach(([k, v]) => { txt(k, bx + 10, y, { taille: 10, couleur: K.gris }); txt(v, W - M - 10, y, { taille: 10, align: "right" }); y += 17; });
  y += 4;
  rect(bx, y, 250, 36, K.vert);
  txt(t.taux ? "TOTAL TTC" : "TOTAL À PAYER", bx + 12, y + 12, { gras: true, taille: 10.5, couleur: K.blanc });
  txt(fmt(t.ttc, " ") + " FCFA", W - M - 12, y + 11, { gras: true, taille: 14, couleur: K.blanc, align: "right" });
  y += 36 + 10;
  if (Number(d.acomptePct) > 0){
    txt("Acompte à la commande (" + d.acomptePct + " %)", bx + 10, y, { taille: 9.5, couleur: K.gris });
    txt(fmt(t.acompte, " ") + " FCFA", W - M - 10, y, { gras: true, taille: 9.5, align: "right", couleur: K.encre }); y += 15;
    txt("Reste à payer à la livraison", bx + 10, y, { taille: 9.5, couleur: K.gris });
    txt(fmt(t.reste, " ") + " FCFA", W - M - 10, y, { taille: 9.5, align: "right" }); y += 15;
  }
  y += 14;

  // message, conditions
  const bloc = (titre, texte) => {
    const ls = envelopper(fR, 9.5, san(texte), W - 2 * M - 24);
    place(24 + ls.length * 13);
    txt(titre.toUpperCase(), M, y, { gras: true, taille: 8, couleur: K.vert }); y += 14;
    ls.forEach(l => { txt(l, M, y, { taille: 9.5 }); y += 13; });
    y += 10;
  };
  if (d.messageProposition) bloc("Message du prestataire", d.messageProposition);
  bloc("Conditions", d.conditions || "Paiement direct au prestataire. Devis valable pendant la durée indiquée.");

  // signatures
  place(100);
  y += 6;
  const sw = (W - 2 * M - 20) / 2;
  rect(M, y, sw, 78, K.blanc, { bord: K.trait, epaisseur: 1 });
  rect(M + sw + 20, y, sw, 78, K.blanc, { bord: K.trait, epaisseur: 1 });
  txt("Le prestataire", M + 12, y + 10, { gras: true, taille: 9, couleur: K.vert });
  txt(em.nom || "", M + 12, y + 24, { taille: 9, couleur: K.gris });
  txt("Bon pour accord du client", M + sw + 32, y + 10, { gras: true, taille: 9, couleur: K.vert });
  txt("Date et signature précédées de la mention « Lu et approuvé »", M + sw + 32, y + 24, { taille: 8, couleur: K.gris });
  return await pdf.save();
}
