// Affiches et panneaux remplaçables par des images réalisées à la main.
//
// Fonctionnement : chaque panneau du décor porte un identifiant (voir docs/AFFICHES.md pour la liste,
// les dimensions et le contenu). Pour remplacer le rendu généré par canvas par une vraie image :
//   1. déposer le fichier dans public/assets/signs/<id>.webp (ou .png / .jpg : indiquer l'extension ci-dessous) ;
//   2. ajouter l'identifiant dans SIGN_IMAGES ci-dessous, avec le ratio largeur / hauteur de l'image.
// Les identifiants absents de la liste gardent le rendu automatique ; aucune requête réseau n'est faite pour eux.
const ACCUEIL={file:'dir-accueil.webp',ratio:2.246},RADIO={file:'dir-radiologie.webp',ratio:2.309},SECURITE={file:'dir-securite.webp',ratio:1.465}
const H404={file:'dir-h404.webp',ratio:1.568},MORGUE={file:'dir-morgue.webp',ratio:1.672},SECTEUR={file:'secteur-patients.webp',ratio:4.315}
// ratio : largeur / hauteur de l'image détourée. La plaque prend la forme de l'image, qui porte son propre cadre métallique.
export const SIGN_IMAGES={
 'dir-accueil':ACCUEIL,
 'dir-radiologie':RADIO,'plaque-radio':RADIO,
 'dir-securite':SECURITE,'plaque-security':SECURITE,
 'dir-h404':H404,'plaque-lab':H404,
 'dir-morgue':MORGUE,'plaque-morgue':MORGUE,
 'sign-secteur-patients':SECTEUR,'suspendu-secteurs':SECTEUR,'plaque-patients':SECTEUR,
 'suspendu-accueil-attente':{file:'suspendu-accueil-attente.webp',ratio:3.947},
 'warn-defense-entrer':{file:'warn-defense-entrer.webp',ratio:.809}
}
export const SIGNS_BASE='/assets/signs/'
export const signImageUrl=id=>id&&SIGN_IMAGES[id]?`${SIGNS_BASE}${SIGN_IMAGES[id].file}`:null
export const signRatio=id=>SIGN_IMAGES[id]?.ratio??null
export const ALL_SIGN_URLS=[...new Set(Object.values(SIGN_IMAGES).map(s=>SIGNS_BASE+s.file))]
