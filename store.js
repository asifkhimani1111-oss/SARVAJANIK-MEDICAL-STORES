
import { auth, db } from "./firebase.js";

import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// આ તમારા બનાવેલા Medical Store Account નો UID છે.
const STORE_OWNER_UID = "L7qdVWkdC8fAHOwdaQyQqb2uYxJ3";

const loginSection = document.getElementById("loginSection");
const dashboardSection = document.getElementById("dashboardSection");

const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const logoutButton = document.getElementById("logoutButton");

const storeForm = document.getElementById("storeForm");
const storeMessage = document.getElementById("storeMessage");

const medicineForm = document.getElementById("medicineForm");
const medicineMessage = document.getElementById("medicineMessage");
const medicineList = document.getElementById("storeMedicineList");

const cancelEditButton = document.getElementById("cancelEditButton");

let currentUser = null;

function showMessage(element, message, success = true) {
  element.textContent = message;
  element.style.color = success ? "#087443" : "#b42318";
}

function getValue(id) {
  return document.getElementById(id).value.trim();
}

function getChecked(id) {
  return document.getElementById(id).checked;
}

function showLogin() {
  loginSection.hidden = false;
  dashboardSection.hidden = true;
}

function showDashboard() {
  loginSection.hidden = true;
  dashboardSection.hidden = false;
}

function clearMedicineForm() {
  medicineForm.reset();

  document.getElementById("medicineId").value = "";
  document.getElementById("medicineActive").checked = true;

  document.getElementById("medicineFormTitle").textContent =
    "નવી દવા ઉમેરો";

  document.getElementById("saveMedicineButton").textContent =
    "દવા સેવ કરો";

  cancelEditButton.hidden = true;
}

async function loadStoreDetails() {
  try {
    const reference = doc(db, "storeSettings", "main");
    const snapshot = await getDoc(reference);

    if (snapshot.exists()) {
      const data = snapshot.data();

      if (data.ownerUid !== currentUser.uid) {
        throw new Error("સ્ટોર માલિકની ઓળખ મળી નથી.");
      }

      document.getElementById("shopName").value = data.name || "";
      document.getElementById("shopAddress").value = data.address || "";
      document.getElementById("shopPhone").value = data.phone || "";
      document.getElementById("shopWhatsapp").value = data.whatsapp || "";

      document.getElementById("welcomeName").textContent =
        `સ્વાગત છે, ${data.name || "સ્ટોર માલિક"}!`;
    } else {
      document.getElementById("welcomeName").textContent =
        "સ્વાગત છે, સ્ટોર માલિક!";
    }
  } catch (error) {
    console.error(error);
    showMessage(storeMessage, "સ્ટોરની માહિતી લોડ થઈ શકી નથી.", false);
  }
}

storeForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) return;

  const name = getValue("shopName");
  const address = getValue("shopAddress");
  const phone = getValue("shopPhone");
  const whatsapp = getValue("shopWhatsapp");

  if (!name || !address || !phone || !whatsapp) {
    showMessage(storeMessage, "બધી માહિતી ભરો.", false);
    return;
  }

  try {
    await setDoc(
      doc(db, "storeSettings", "main"),
      {
        name,
        address,
        phone,
        whatsapp,
        ownerUid: currentUser.uid,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    document.getElementById("welcomeName").textContent =
      `સ્વાગત છે, ${name}!`;

    showMessage(storeMessage, "સ્ટોરની માહિતી સેવ થઈ ગઈ.");
  } catch (error) {
    console.error(error);
    showMessage(
      storeMessage,
      "માહિતી સેવ થઈ નથી. Firestore Rules તપાસવાની જરૂર છે.",
      false
    );
  }
});

async function loadMedicines() {
  if (!currentUser) return;

  medicineList.textContent = "દવાઓ લોડ થઈ રહી છે...";

  try {
    const medicineQuery = query(
      collection(db, "medicines"),
      where("ownerUid", "==", currentUser.uid)
    );

    const snapshot = await getDocs(medicineQuery);

    medicineList.replaceChildren();

    if (snapshot.empty) {
      medicineList.textContent = "હજી કોઈ દવા ઉમેરાઈ નથી.";
      return;
    }

    snapshot.forEach((medicineDoc) => {
      const medicine = medicineDoc.data();

      const card = document.createElement("article");
      card.className = "medicine-row";

      const title = document.createElement("h3");
      title.textContent = medicine.name || "દવાનું નામ નથી";

      const category = document.createElement("p");
      category.textContent = `કેટેગરી: ${medicine.category || "-"}`;

      const price = document.createElement("p");
      price.textContent =
        `ભાવ: ₹${medicine.price} / ${medicine.unit || "પેક"}`;

      const stock = document.createElement("p");
      stock.textContent = `સ્ટોક: ${medicine.stock ?? 0}`;

      const status = document.createElement("p");
      status.textContent = medicine.active
        ? "ગ્રાહકને દેખાય છે"
        : "ગ્રાહકથી છુપાવેલી છે";

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "edit-button";
      editButton.textContent = "ફેરફાર કરો";

      editButton.addEventListener("click", () => {
        editMedicine(medicineDoc.id, medicine);
      });

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "delete-button";
      deleteButton.textContent = "ડિલીટ કરો";

      deleteButton.addEventListener("click", async () => {
        const confirmed = confirm(
          "શું તમે આ દવા ડિલીટ કરવા માંગો છો?"
        );

        if (!confirmed) return;

        try {
          await deleteDoc(
            doc(db, "medicines", medicineDoc.id)
          );

          await loadMedicines();
        } catch (error) {
          console.error(error);
          showMessage(
            medicineMessage,
            "દવા ડિલીટ થઈ નથી. Rules તપાસો.",
            false
          );
        }
      });

      const actions = document.createElement("div");
      actions.className = "row-actions";
      actions.append(editButton, deleteButton);

      card.append(title, category, price, stock, status, actions);
      medicineList.appendChild(card);
    });
  } catch (error) {
    console.error(error);
    medicineList.textContent =
      "દવાઓ લોડ થઈ શકી નથી. Firestore Rules તપાસવાની જરૂર છે.";
  }
}

function editMedicine(id, medicine) {
  document.getElementById("medicineId").value = id;
  document.getElementById("medicineName").value = medicine.name || "";
  document.getElementById("medicineCategory").value =
    medicine.category || "Other";
  document.getElementById("medicineInfo").value = medicine.info || "";
  document.getElementById("medicinePrice").value = medicine.price ?? "";
  document.getElementById("medicineUnit").value =
    medicine.unit || "પેક";
  document.getElementById("medicineStock").value =
    medicine.stock ?? 0;

  document.getElementById("prescriptionRequired").checked =
    medicine.prescriptionRequired === true;

  document.getElementById("medicineActive").checked =
    medicine.active !== false;

  document.getElementById("medicineFormTitle").textContent =
    "દવાની માહિતી બદલો";

  document.getElementById("saveMedicineButton").textContent =
    "ફેરફાર સેવ કરો";

  cancelEditButton.hidden = false;

  window.scrollTo({ top: 0, behavior: "smooth" });
}

medicineForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) return;

  const id = getValue("medicineId");

  const price = Number(getValue("medicinePrice"));
  const stock = Number(getValue("medicineStock"));

  if (!Number.isFinite(price) || price < 0 ||
      !Number.isInteger(stock) || stock < 0) {
    showMessage(medicineMessage, "ભાવ અને સ્ટોક યોગ્ય રીતે ભરો.", false);
    return;
  }

  const medicine = {
    name: getValue("medicineName"),
    category: getValue("medicineCategory"),
    info: getValue("medicineInfo"),
    price,
    unit: getValue("medicineUnit"),
    stock,
    prescriptionRequired: getChecked("prescriptionRequired"),
    active: getChecked("medicineActive"),
    ownerUid: currentUser.uid,
    updatedAt: serverTimestamp()
  };

  if (!medicine.name || !medicine.category) {
    showMessage(medicineMessage, "દવાનું નામ અને કેટેગરી ભરો.", false);
    return;
  }

  try {
    if (id) {
      const reference = doc(db, "medicines", id);
      const existing = await getDoc(reference);

      if (!existing.exists() ||
          existing.data().ownerUid !== currentUser.uid) {
        throw new Error("આ દવા બદલવાની પરવાનગી નથી.");
      }

      await updateDoc(reference, medicine);

      showMessage(medicineMessage, "દવાની માહિતી બદલાઈ ગઈ.");
    } else {
      await addDoc(collection(db, "medicines"), {
        ...medicine,
        createdAt: serverTimestamp()
      });

      showMessage(medicineMessage, "નવી દવા ઉમેરાઈ ગઈ.");
    }

    clearMedicineForm();
    await loadMedicines();

  } catch (error) {
    console.error(error);
    showMessage(
      medicineMessage,
      "દવા સેવ થઈ નથી. Firestore Rules તપાસવાની જરૂર છે.",
      false
    );
  }
});

cancelEditButton.addEventListener("click", () => {
  clearMedicineForm();
  showMessage(medicineMessage, "ફેરફાર રદ કર્યો.");
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = getValue("loginEmail");
  const password = document.getElementById("loginPassword").value;

  try {
    showMessage(loginMessage, "લોગિન થઈ રહ્યું છે...");

    const result = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    if (result.user.uid !== STORE_OWNER_UID) {
      await signOut(auth);
      throw new Error("આ એકાઉન્ટને આ સ્ટોરની પરવાનગી નથી.");
    }

  } catch (error) {
    console.error(error);
    showMessage(
      loginMessage,
      "લોગિન થઈ શક્યું નથી. ઈમેલ, પાસવર્ડ અને UID તપાસો.",
      false
    );
  }
});

logoutButton.addEventListener("click", async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, async (user) => {
  if (user && user.uid === STORE_OWNER_UID) {
    currentUser = user;
    showDashboard();

    await loadStoreDetails();
    await loadMedicines();

  } else {
    currentUser = null;
    showLogin();

    if (user) {
      await signOut(auth);
    }
  }
});
