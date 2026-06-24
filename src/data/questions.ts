export interface QuestionItem {
  id: string;
  text: string;
  type: 'truth' | 'dare';
  level: 'leve' | 'picante';
}

export const TRUTHS_LEVE: string[] = [
  "¿Quién es la persona que mejor te cae de esta habitación y por qué?",
  "¿Cuál ha sido tu mentira más piadosa o ridícula?",
  "¿Cuál es el hábito más extraño o gracioso que tienes cuando estás solo?",
  "¿Qué es lo más vergonzoso que has buscado en Google últimamente?",
  "¿Cuál ha sido la peor cita que has tenido en tu vida?",
  "¿Qué superpoder inútil te gustaría tener?",
  "¿Quién fue tu primer amor platónico famoso o real?",
  "¿Qué comida odias que a todo el mundo parece encantarle?",
  "¿Si pudieras cambiar tu nombre, cuál elegirías y por qué?",
  "¿Cuál ha sido el peor regalo que has recibido en tu cumpleaños?",
  "¿Has fingido alguna vez estar enfermo para evitar salir con alguien?",
  "¿Cuál es la canción más culposa o vergonzosa que te encanta escuchar?",
  "¿Qué harías si ganaras un millón de dólares mañana mismo?",
  "¿Cuál ha sido tu mayor osadía o travesura en el colegio?",
  "¿De qué personaje de caricatura estabas enamorado/a en tu infancia?"
];

export const TRUTHS_PICANTE: string[] = [
  "¿Qué es lo más atrevido o íntimo que has hecho en un lugar público?",
  "¿Cuál ha sido tu peor experiencia o fallo en la intimidad?",
  "¿Quién de esta sala te parece la persona más atractiva y por qué?",
  "¿Has tenido alguna fantasía con el novio/a o ex de algún amigo aquí presente?",
  "¿Has stalkeado de manera obsesiva a un ex recientemente? ¿Qué descubriste?",
  "¿Cuál es el secreto más oscuro que le ocultas a tus padres o pareja?",
  "¿Qué es lo primero en lo que te fijas físicamente cuando ves a alguien?",
  "¿Has tenido alguna aventura de una noche? ¿Cómo calificarías la experiencia?",
  "¿Si pudieras pasar una noche salvaje con alguien en esta sala sin consecuencias, con quién sería?",
  "¿Cuál es la fantasía más inusual o secreta que tienes y no le has contado a casi nadie?",
  "¿Has enviado o recibido fotos íntimas alguna vez? ¿Qué sentiste?",
  "¿Qué es lo más prohibido o pecaminoso en lo que has pensado recientemente?",
  "¿Has besado a más de una persona en una sola noche? Cuéntanos el contexto.",
  "¿Cuál ha sido el lugar más extraño donde has tenido un encuentro amoroso?",
  "¿Has fingido un orgasmo o un momento de pasión alguna vez? ¿Por qué?"
];

export const DARES_LEVE: string[] = [
  "Imita a un animal de tu elección durante 30 segundos de manera exagerada.",
  "Envía un mensaje de voz a un familiar diciendo lo mucho que te gustan los brócolis en inglés.",
  "Haz 10 flexiones de pecho o sentadillas mientras dices 'Soy el campeón'.",
  "Habla con un acento extranjero (ej. italiano o español castizo) durante las próximas dos rondas.",
  "Deja que la persona a tu derecha te dibuje un pequeño bigote en la cara con delineador o marcador borrable.",
  "Intenta lamerte el codo durante 30 segundos.",
  "Haz una pasarela de modas exagerada cruzando la habitación.",
  "Canta el coro de tu canción favorita usando solo la vocal 'A'.",
  "Equilibra una cuchara en tu nariz durante 20 segundos.",
  "Mantente en una sola pierna haciendo la postura del árbol de yoga durante las próximas dos rondas.",
  "Come una rebanada de limón o una cucharada de salsa picante sin hacer caras.",
  "Cuenta un chiste tan malo que haga reír a la gente de pura pena.",
  "Haz muecas graciosas y tontas a cada persona de la habitación de forma individual.",
  "Haz la postura del puente durante 15 segundos.",
  "Declárale tu amor eterno a un objeto inanimado (como una silla o planta) con mucha pasión."
];

export const DARES_PICANTE: string[] = [
  "Hazle un masaje en los hombros o cuello a la persona más atractiva de la sala por 1 minuto.",
  "Deja que el grupo revise tu historial de búsqueda de Google y de redes sociales durante 1 minuto.",
  "Hazle un baile de 20 segundos (divertido o sensual) a la persona que elija el grupo.",
  "Susúrrale algo sugerente al oído a la persona que tengas a tu izquierda.",
  "Deja que alguien del grupo te escriba una palabra atrevida en la frente con delineador de ojos.",
  "Quítate dos prendas de ropa (que no sean calzado) durante el resto del juego.",
  "Llama a tu ex (o envíale un mensaje) que diga: 'Te extrañé hoy, ¿podemos hablar?' y pon el altavoz/muestra la pantalla.",
  "Envía un mensaje atrevido al tercer contacto de tus chats de WhatsApp recientes.",
  "Come una fresa, uva u otra fruta directamente de la boca o mano de otro jugador.",
  "Pídele a alguien del grupo que te dé una nalgada suave o un beso apasionado en la mejilla.",
  "Deja que el grupo te vende los ojos y adivina quién es la persona que te besa en la mejilla o te toca la mano.",
  "Haz un gemido de pasión realista durante 10 segundos en completo silencio del grupo.",
  "Describe detalladamente cómo sería tu noche romántica perfecta con alguien de esta sala.",
  "Comparte el mensaje de texto más picante o comprometedor que hayas recibido en tu celular.",
  "Abraza apasionadamente a la persona de tu elección durante 30 segundos sintiendo los latidos de su corazón."
];

export function getRandomItem(type: 'truth' | 'dare', level: 'leve' | 'picante'): string {
  if (type === 'truth') {
    const list = level === 'leve' ? TRUTHS_LEVE : TRUTHS_PICANTE;
    return list[Math.floor(Math.random() * list.length)];
  } else {
    const list = level === 'leve' ? DARES_LEVE : DARES_PICANTE;
    return list[Math.floor(Math.random() * list.length)];
  }
}

// Complete list of all items for seeding database
export const ALL_QUESTIONS: QuestionItem[] = [
  ...TRUTHS_LEVE.map((text, i) => ({ id: `tl_${i}`, text, type: 'truth' as const, level: 'leve' as const })),
  ...TRUTHS_PICANTE.map((text, i) => ({ id: `tp_${i}`, text, type: 'truth' as const, level: 'picante' as const })),
  ...DARES_LEVE.map((text, i) => ({ id: `dl_${i}`, text, type: 'dare' as const, level: 'leve' as const })),
  ...DARES_PICANTE.map((text, i) => ({ id: `dp_${i}`, text, type: 'dare' as const, level: 'picante' as const })),
];

export function generateDeck(type: 'truth' | 'dare', level: 'leve' | 'picante'): string[] {
  const ids = ALL_QUESTIONS.filter(q => q.type === type && q.level === level).map(q => q.id);
  return ids.sort(() => Math.random() - 0.5);
}

import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

export async function seedQuestionsIfEmpty(db: Firestore) {
  try {
    const qCol = collection(db, 'questions');
    const snapshot = await getDocs(qCol);
    if (snapshot.empty) {
      console.log('Seeding questions in Firestore...');
      const batch = writeBatch(db);
      ALL_QUESTIONS.forEach((q) => {
        const docRef = doc(db, 'questions', q.id);
        batch.set(docRef, q);
      });
      await batch.commit();
      console.log('Seeding complete.');
    }
  } catch (error) {
    console.error('Error seeding questions:', error);
  }
}

let cachedFirestoreQuestions: QuestionItem[] = [];

export async function preloadQuestions(db: Firestore): Promise<void> {
  if (cachedFirestoreQuestions.length > 0) return;

  try {
    await seedQuestionsIfEmpty(db);
    const qCol = collection(db, 'questions');
    const snapshot = await getDocs(qCol);
    cachedFirestoreQuestions = snapshot.docs.map(doc => doc.data() as QuestionItem);
  } catch (err) {
    console.error("Error preloading questions:", err);
  }
}

export async function getQuestion(
  db: Firestore | null,
  type: 'truth' | 'dare',
  level: 'leve' | 'picante'
): Promise<string> {
  if (!db) {
    return getRandomItem(type, level);
  }

  try {
    // If real-time listener hasn't loaded data yet, load it once
    if (cachedFirestoreQuestions.length === 0) {
      await seedQuestionsIfEmpty(db);
      const qCol = collection(db, 'questions');
      const snapshot = await getDocs(qCol);
      cachedFirestoreQuestions = snapshot.docs.map(doc => doc.data() as QuestionItem);
    }

    const filtered = cachedFirestoreQuestions.filter(
      q => q.type === type && q.level === level
    );

    if (filtered.length > 0) {
      return filtered[Math.floor(Math.random() * filtered.length)].text;
    }
  } catch (err) {
    console.error('Error loading questions from Firestore:', err);
  }

  return getRandomItem(type, level);
}

export function getQuestionByIdSync(id: string): string {
  const q = cachedFirestoreQuestions.find(x => x.id === id) || ALL_QUESTIONS.find(x => x.id === id);
  return q ? q.text : "Pregunta o reto no encontrado";
}

