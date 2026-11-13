
import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const medicineList = document.getElementById("medicineList");
const searchInput = document.getElementById("searchMedicine");
const medicineCount = document.getElementById("medicineCount");

const storeName = document.getElementById("storeName");
const callButton = document.getElementById("callButton");
const whatsappButton = document.getElementById("whatsappButton");

const orderMessage = document.getElementById("orderMessage");
const sendOrder = document.getElementById("sendOrder");

let medicines = [];
let store = {};

function cleanPhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function showMessage(message) {
  medicineList.textContent = message;
}

function renderMedicines(items) {
  medicineList.replaceChildren();
  medicineCount.textContent = `${items.length} દવા`;

  if (!items.length) {
    showMessage("કોઈ દવા મળી નથી.");
    return;
  }

  items.forEach((medicine) => {
    const card = document.createElement("article");
    card.className = "medicine-card";

    const name = document.createElement("h3");
    name.textContent = medicine.name || "દવાનું નામ નથી";

    const category = document.createElement("p");
    category.textContent = medicine.category || "સામાન્ય દવા";

    const info = document.createElement("p");
    info.textContent = medicine.info || "";

    const price = document.createElement("p");
    price.className = "price";
    price.textContent =
      medicine.price != null
        ? `₹${medicine.price} / ${medicine.unit || "પેક"}`
        : "ભાવ માટે સ્ટોરનો સંપર્ક કરો";

    const stock = document.createElement("p");
    stock.textContent =
      medicine.available === false || medicine.stock === 0
        ? "હાલ ઉપલબ્ધ નથી"
        : "સ્ટોકની પુષ્ટિ સ્ટોર કરશે";

    const prescription = document.createElement("p");
    prescription.textContent = medicine.prescriptionRequired
      ? "પ્રિસ્ક્રિપ્શન જરૂરી"
      : "ફાર્માસિસ્ટની પુષ્ટિ જરૂરી";

    card.append(name, category, info, price, stock, prescription);
    medicineList.appendChild(card);
  });
}

async function loadStore() {
  try {
    const snapshot = await getDoc(doc(db, "storeSettings", "main"));

    if (!snapshot.exists()) {
      storeName.textContent = "સ્ટોરની માહિતી હજી ઉમેરાઈ નથી.";
      return;
    }

    store = snapshot.data();

    storeName.textContent = store.name || "SARVAJANIK MEDICAL STORES";

    const phone = cleanPhone(store.phone);
    const whatsapp = cleanPhone(store.whatsapp);

    if (phone) {
      callButton.href = `tel:${phone}`;
    } else {
      callButton.hidden = true;
    }

    if (whatsapp) {
      whatsappButton.href =
        `https://wa.me/${whatsapp}`;
    } else {
      whatsappButton.hidden = true;
    }
  } catch (error) {
    console.error("Store load error:", error);
    storeName.textContent = "સ્ટોરની માહિતી લોડ થઈ શકી નથી.";
  }
}

async function loadMedicines() {
  try {
    showMessage("દવાઓ લોડ થઈ રહી છે...");

    const snapshot = await getDocs(collection(db, "medicines"));

    medicines = snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data()
    }));

    medicines = medicines.filter(
      (medicine) => medicine.active !== false
    );

    renderMedicines(medicines);
  } catch (error) {
    console.error("Medicine load error:", error);
    showMessage(
      "દવાઓ લોડ થઈ શકી નથી. કૃપા કરીને પછી પ્રયાસ કરો."
    );
  }
}

searchInput.addEventListener("input", () => {
  const search = searchInput.value.trim().toLowerCase();

  const filtered = medicines.filter((medicine) =>
    String(medicine.name || "").toLowerCase().includes(search) ||
    String(medicine.category || "").toLowerCase().includes(search)
  );

  renderMedicines(filtered);
});

sendOrder.addEventListener("click", () => {
  const message = orderMessage.value.trim();
  const whatsapp = cleanPhone(store.whatsapp);

  if (!message) {
    alert("કૃપા કરીને દવાનું નામ અને જરૂરી માહિતી લખો.");
    return;
  }

  if (!whatsapp) {
    alert("સ્ટોરનો WhatsApp નંબર ઉપલબ્ધ નથી.");
    return;
  }

  const text =
    "નમસ્તે, SARVAJANIK MEDICAL STORES.%0A" +
    "મારે નીચેની દવા વિશે પૂછપરછ કરવી છે:%0A" +
    encodeURIComponent(message) +
    "%0Aકૃપા કરીને ઉપલબ્ધતા અને ભાવ જણાવશો.%0A" +
    "જરૂરી પ્રિસ્ક્રિપ્શન અને ફાર્માસિસ્ટની મંજૂરી પછી જ દવાનું વેચાણ કરશો.";

  window.open(
    `https://wa.me/${whatsapp}?text=${text}`,
    "_blank",
    "noopener,noreferrer"
  );
});

loadStore();
loadMedicines();
