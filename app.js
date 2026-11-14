
import { db } from "./firebase.js";

import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const searchInput = document.getElementById("searchMedicine");
const storeName = document.getElementById("storeName");
const callButton = document.getElementById("callButton");
const whatsappButton = document.getElementById("whatsappButton");
const medicineList = document.getElementById("medicineList");
const medicineCount = document.getElementById("medicineCount");
const orderMessage = document.getElementById("orderMessage");
const sendOrder = document.getElementById("sendOrder");

let medicines = [];
let storeData = {};

function showText(element, message) {
  if (element) element.textContent = message;
}

async function loadStore() {
  try {
    const snapshot = await getDoc(doc(db, "storeSettings", "main"));

    if (!snapshot.exists()) {
      showText(storeName, "સ્ટોરની માહિતી ઉપલબ્ધ નથી");
      return;
    }

    storeData = snapshot.data();

    showText(
      storeName,
      storeData.name || "SARVAJANIK MEDICAL STORES"
    );

    if (callButton) {
      if (storeData.phone) {
        callButton.href = `tel:${storeData.phone}`;
        callButton.hidden = false;
      } else {
        callButton.hidden = true;
      }
    }

    if (whatsappButton) {
      if (storeData.whatsapp) {
        whatsappButton.href =
          `https://wa.me/${storeData.whatsapp.replace(/\D/g, "")}`;
        whatsappButton.target = "_blank";
        whatsappButton.rel = "noopener noreferrer";
        whatsappButton.hidden = false;
      } else {
        whatsappButton.hidden = true;
      }
    }
  } catch (error) {
    console.error("Store loading error:", error);
    showText(storeName, "સ્ટોરની માહિતી લોડ થઈ શકી નથી");
  }
}

function renderMedicines(search = "") {
  if (!medicineList) return;

  medicineList.replaceChildren();

  const term = search.toLowerCase().trim();

  const filtered = medicines.filter((medicine) => {
    const name = (medicine.name || "").toLowerCase();
    const category = (medicine.category || "").toLowerCase();

    return name.includes(term) || category.includes(term);
  });

  showText(medicineCount, `કુલ દવાઓ: ${filtered.length}`);

  if (filtered.length === 0) {
    showText(medicineList, "કોઈ દવા મળી નથી.");
    return;
  }

  filtered.forEach((medicine) => {
    const card = document.createElement("article");
    card.className = "medicine-card";

    // દવાનો ફોટો
    if (medicine.imageBase64) {
      const image = document.createElement("img");

      image.src = medicine.imageBase64;
      image.alt = medicine.name || "દવાનો ફોટો";
      image.loading = "lazy";

      image.style.width = "100%";
      image.style.maxWidth = "220px";
      image.style.height = "180px";
      image.style.objectFit = "contain";
      image.style.display = "block";
      image.style.margin = "10px auto";
      image.style.borderRadius = "10px";

      image.onerror = () => image.remove();

      card.appendChild(image);
    }

    const title = document.createElement("h3");
    title.textContent = medicine.name || "દવાનું નામ નથી";

    const category = document.createElement("p");
    category.textContent =
      `કેટેગરી: ${medicine.category || "-"}`;

    const info = document.createElement("p");
    info.textContent = medicine.info || "";

    const price = document.createElement("p");
    price.textContent =
      `ભાવ: ₹${medicine.price ?? 0} / ${medicine.unit || "પેક"}`;

    const stock = document.createElement("p");
    stock.textContent =
      Number(medicine.stock) > 0
        ? "ઉપલબ્ધ"
        : "સ્ટોક ઉપલબ્ધ નથી";

    const prescription = document.createElement("p");
    prescription.textContent = medicine.prescriptionRequired
      ? "માન્ય પ્રિસ્ક્રિપ્શન અને ફાર્માસિસ્ટની ચકાસણી જરૂરી"
      : "ફાર્માસિસ્ટની સલાહ મુજબ ઉપયોગ કરો";

    card.append(
      title,
      category,
      info,
      price,
      stock,
      prescription
    );

    medicineList.appendChild(card);
  });
}

async function loadMedicines() {
  try {
    showText(medicineList, "દવાઓ લોડ થઈ રહી છે...");

    const activeQuery = query(
      collection(db, "medicines"),
      where("active", "==", true)
    );

    const snapshot = await getDocs(activeQuery);

    medicines = snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data()
    }));

    renderMedicines(searchInput?.value || "");

  } catch (error) {
    console.error("Medicine loading error:", error);

    showText(
      medicineList,
      "દવાઓ લોડ થઈ શકી નથી. ઇન્ટરનેટ અને Firestore Rules તપાસો."
    );

    showText(medicineCount, "દવાઓ ઉપલબ્ધ નથી");
  }
}

if (searchInput) {
  searchInput.addEventListener("input", () => {
    renderMedicines(searchInput.value);
  });
}

if (sendOrder) {
  sendOrder.addEventListener("click", () => {
    const message = orderMessage?.value.trim() || "";

    if (!message) {
      alert("કૃપા કરીને તમારી દવાની પૂછપરછ લખો.");
      return;
    }

    const number = (storeData.whatsapp || "").replace(/\D/g, "");

    if (!number) {
      alert("સ્ટોરનો WhatsApp નંબર ઉપલબ્ધ નથી.");
      return;
    }

    const finalMessage =
      `નમસ્તે, SARVAJANIK MEDICAL STORES.\n\n${message}\n\n` +
      "જરૂરી દવાઓ માટે પ્રિસ્ક્રિપ્શનની ચકાસણી લાગુ પડશે.";

    const url =
      `https://wa.me/${number}?text=${encodeURIComponent(finalMessage)}`;

    window.open(url, "_blank", "noopener,noreferrer");
  });
}

async function startApp() {
  await loadStore();
  await loadMedicines();
}

startApp();
