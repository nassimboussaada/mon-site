"use strict";

const DOSSIER_PROJETS = "projets";
const FICHIER_JSON = "projets.json";

const grille = document.getElementById("grille-projets");
const modale = document.getElementById("modale");

let projets = [];
let dernierDeclencheur = null;

/* ---------- Utilitaires ---------- */

// Construit un chemin relatif vers un fichier d'un projet (relatif => compatible GitHub Pages)
function cheminFichier(projet, fichier) {
  return `${DOSSIER_PROJETS}/${encodeURIComponent(projet.id)}/${encodeURIComponent(fichier)}`;
}

// Crée un élément de façon sûre (pas d'innerHTML => pas de risque d'injection)
function el(tag, { classe, texte, attrs } = {}) {
  const node = document.createElement(tag);
  if (classe) node.className = classe;
  if (texte !== undefined) node.textContent = texte;
  if (attrs) Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  return node;
}

function remplirTags(ul, tags) {
  ul.replaceChildren();
  (tags || []).forEach((t) => ul.appendChild(el("li", { texte: t })));
  ul.hidden = !tags || tags.length === 0;
}

/* ---------- Grille ---------- */

function creerCarte(projet) {
  const carte = el("button", {
    classe: "carte",
    attrs: { type: "button", "aria-haspopup": "dialog" },
  });

  const img = el("img", {
    classe: "carte-image",
    attrs: {
      src: cheminFichier(projet, projet.couverture),
      alt: `Couverture du projet ${projet.titre}`,
      loading: "lazy",
    },
  });
  img.addEventListener("error", () => img.removeAttribute("src")); // fond dégradé de secours

  const corps = el("div", { classe: "carte-corps" });
  corps.appendChild(el("h3", { classe: "carte-titre", texte: projet.titre }));
  corps.appendChild(el("p", { classe: "carte-desc", texte: projet.description_courte }));

  carte.append(img, corps);
  carte.addEventListener("click", () => ouvrirProjet(projet, carte));
  return carte;
}

function afficherGrille() {
  grille.replaceChildren();
  if (projets.length === 0) {
    grille.appendChild(el("p", { classe: "message", texte: "Aucun projet pour le moment." }));
    return;
  }
  projets.forEach((p) => grille.appendChild(creerCarte(p)));
}

/* ---------- Modale ---------- */

function ouvrirProjet(projet, declencheur = null) {
  dernierDeclencheur = declencheur;

  document.getElementById("modale-titre").textContent = projet.titre;
  document.getElementById("modale-description").textContent =
    projet.description || projet.description_courte || "";
  remplirTags(document.getElementById("modale-tags"), projet.tags);

  // Galerie
  const galerie = document.getElementById("modale-galerie");
  galerie.replaceChildren();
  const images = projet.images || [];
  images.forEach((item) => {
    const src = cheminFichier(projet, item.fichier);
    const figure = el("figure");
    const lien = el("a", { attrs: { href: src, target: "_blank", rel: "noopener" } });
    lien.appendChild(
      el("img", {
        attrs: { src, alt: item.legende || projet.titre, loading: "lazy" },
      })
    );
    figure.appendChild(lien);
    if (item.legende) figure.appendChild(el("figcaption", { texte: item.legende }));
    galerie.appendChild(figure);
  });
  document.getElementById("modale-galerie-bloc").hidden = images.length === 0;

  // PDF
  const listePdf = document.getElementById("modale-pdfs");
  listePdf.replaceChildren();
  const pdfs = projet.pdfs || [];
  pdfs.forEach((pdf) => {
    const src = cheminFichier(projet, pdf.fichier);
    const li = el("li", { classe: "pdf-item" });
    li.appendChild(el("span", { classe: "pdf-nom", texte: pdf.titre || pdf.fichier }));

    const actions = el("div", { classe: "pdf-actions" });
    actions.appendChild(
      el("a", {
        classe: "bouton",
        texte: "Ouvrir",
        attrs: { href: src, target: "_blank", rel: "noopener" },
      })
    );
    actions.appendChild(
      el("a", {
        classe: "bouton",
        texte: "Télécharger",
        attrs: { href: src, download: pdf.fichier },
      })
    );
    li.appendChild(actions);
    listePdf.appendChild(li);
  });
  document.getElementById("modale-pdfs-bloc").hidden = pdfs.length === 0;

  if (!modale.open) modale.showModal();
  modale.scrollTop = 0;

  // Lien direct vers le projet (ex. monsite.github.io/#projet1)
  history.replaceState(null, "", `#${encodeURIComponent(projet.id)}`);
}

function fermerModale() {
  if (modale.open) modale.close();
}

modale.addEventListener("close", () => {
  history.replaceState(null, "", location.pathname + location.search);
  if (dernierDeclencheur) dernierDeclencheur.focus();
});

document.getElementById("modale-fermer").addEventListener("click", fermerModale);

// Clic sur le fond sombre (en dehors du contenu) => fermeture
modale.addEventListener("click", (e) => {
  const r = modale.getBoundingClientRect();
  const dehors =
    e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  if (dehors) fermerModale();
});

/* ---------- Chargement ---------- */

async function chargerProjets() {
  try {
    const reponse = await fetch(FICHIER_JSON, { cache: "no-cache" });
    if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
    const donnees = await reponse.json();
    projets = Array.isArray(donnees) ? donnees : donnees.projets || [];
    afficherGrille();

    // Ouverture directe via l'ancre (#id)
    const id = decodeURIComponent(location.hash.slice(1));
    const cible = projets.find((p) => p.id === id);
    if (cible) ouvrirProjet(cible);
  } catch (erreur) {
    console.error("Impossible de charger projets.json :", erreur);
    grille.replaceChildren(
      el("p", {
        classe: "message",
        texte:
          "Impossible de charger les projets. Si vous testez en local, lancez un petit serveur (voir le README) : fetch() ne fonctionne pas avec file://.",
      })
    );
  }
}

document.getElementById("annee").textContent = new Date().getFullYear();
chargerProjets();
