import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";

export async function testFirestore() {
  const ref = collection(db, "sabores_salgados");
  const snap = await getDocs(ref);
  snap.forEach((doc) => console.log(doc.id, doc.data()));
}
