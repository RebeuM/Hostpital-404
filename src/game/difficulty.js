// Modes de difficulté : le monstre, l'endurance et le rythme des frayeurs. Normal correspond au jeu tel qu'il a été réglé.
export const DIFFICULTY_IDS=['easy','normal','hard']
export const DIFFICULTIES={
 easy:{label:'Facile',hint:'Monstre plus lent, plus de souffle, screamers et alertes plus espacés.',monster:.92,hearing:.8,staminaSeconds:16,pace:1.25,hideRange:5,lunge:false},
 normal:{label:'Normale',hint:'L’expérience prévue.',monster:1,hearing:1,staminaSeconds:12,pace:1,hideRange:7,lunge:true},
 hard:{label:'Difficile',hint:'Monstre plus rapide, moins de souffle, screamers plus fréquents : chaque minute compte.',monster:1.06,hearing:1.2,staminaSeconds:10,pace:.8,hideRange:9,lunge:true}
}
export const difficultyOf=settings=>DIFFICULTIES[settings?.difficulty]||DIFFICULTIES.normal
