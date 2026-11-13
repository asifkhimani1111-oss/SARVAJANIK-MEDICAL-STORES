
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

const STORE_OWNER_UID = "L7qdVWkdC8fAHOwdaQyQqb2uYxJ3";

const $ = (id) => document.getElementById(id);

const loginSection = $("loginSection");
const dashboardSection = $("dashboardSection");
const loginForm = $("loginForm");
const loginMessage = $("loginMessage");
const logoutButton = $("logoutButton");
const storeForm = $("storeForm");
const storeMessage = $("storeMessage");
const medicineForm = $("medicineForm");
const medicineMessage = $("medicineMessage");
const medicineList = $("storeMedicineList");
const photoInput = $("medicinePhoto");
const photoPreview = $("medicinePhotoPreview");
const removePhotoButton = $("removeMedicinePhoto");
const cancelEditButton = $("cancelEditButton");

let currentUser = null;
let selectedPhoto = null;
let existingPhoto = null;

function message(element, text, success = true) {
  element.textContent = text;
  element.style.color = success ? "#087443" : "#b42318";
}

function value(id) {
  return $(id).value.trim();
}

function showLogin() {
  loginSection.hidden = false;
  dashboardSection.hidden = true;
}

function showDashboard() {
  loginSection.hidden = true;
  dashboardSection.hidden = false;
}

function showPhoto(data) {
  if (data) {
    photoPreview.src = data;
    photoPreview.hidden = false;
    removePhotoButton.hidden = false;
  } else {
    photoPreview.removeAttribute("src");
    photoPreview.hidden = true;
    removePhotoButton.hidden = true;
  }
}

function clearPhoto() {
  selectedPhoto = null;
  existingPhoto = null;
  photoInput.value = "";
  showPhoto(null);
}

// ફોટાને નાનો JPEG બનાવી Firestore માટે તૈયાર કરે છે.
async function compressPhoto(file) {
  if (!file || !file.type.startsWith("image/")) {
    throw new Error("યોગ્ય ફોટો પસંદ કરો.");
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error("ફોટો 10 MB કરતાં નાનો હોવો જોઈએ.");
  }

  const image = new Image();
  const objectUrl = URL.createObjectURL(file);

  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = objectUrl;
    });

    const maxSide = 700;
    const scale = Math.min(
      1,
      maxSide / Math.max(image.width, image.height)
    );

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("ફોટો તૈયાર થઈ શક્યો નથી.");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    let quality = 0.72;
    let blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );

    while (blob && blob.size > 350 * 1024 && quality > 0.35) {
      quality -= 0.1;
      blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality)
      );
    }

    if (!blob || blob.size > 350 * 1024) {
      throw new Error("ફોટો વધુ મોટો છે. નાનો ફોટો પસંદ કરો.");
    }

    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

photoInput.addEventListener("change", async () => {
  const file = photoInput.files[0];

  if (!file) return;

  try {
    message(medicineMessage, "ફોટો તૈયાર થઈ રહ્યો છે...");

    selectedPhoto = await compressPhoto(file);
    showPhoto(selectedPhoto);

    message(medicineMessage, "ફોટો તૈયાર છે. હવે દવા સેવ કરો.");
  } catch (error) {
    selectedPhoto = null;
    photoInput.value = "";
    showPhoto(existingPhoto);
    message(medicineMessage, error.message || "ફોટો તૈયાર થયો નથી.", false);
  }
});

removePhotoButton.addEventListener("click", () => {
  selectedPhoto = null;
  existingPhoto = null;
  photoInput.value = "";
  showPhoto(null);
  message(medicineMessage, "ફોટો દૂર કર્યો. દવા સેવ કરો.");
});

async function loadStoreDetails() {
  try {
    const snapshot = await getDoc(doc(db, "storeSettings", "main"));

    if (snapshot.exists()) {
      const data = snapshot.data();

      if (data.ownerUid !== currentUser.uid) {
        throw new Error("સ્ટોર માલિકની ઓળખ મળી નથી.");
      }

      $("shopName").value = data.name || "";
      $("shopAddress").value = data.address || "";
      $("shopPhone").value = data.phone || "";
      $("shopWhatsapp").value = data.whatsapp || "";

      $("welcomeName").textContent = `સ્વાગત છે, ${data.name || "સ્ટોર માલિક"}!`;
    } else {
      $("welcomeName").textContent = "સ્વાગત છે, સ્ટોર માલિક!";
    }
  } catch (error) {
    console.error(error);
    message(storeMessage, "સ્ટોરની માહિતી લોડ થઈ શકી નથી.", false);
  }
}

storeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) return;

  const name = value("shopName");
  const address = value("shopAddress");
  const phone = value("shopPhone");
  const whatsapp = value("shopWhatsapp");

  if (!name || !address || !phone || !whatsapp) {
    message(storeMessage, "બધી માહિતી ભરો.", false);
    return;
  }

  try {
    await setDoc(doc(db, "storeSettings", "main"), {
      name,
      address,
      phone,
      whatsapp,
      ownerUid: currentUser.uid,
      updatedAt: serverTimestamp()
    }, { merge: true });

    $("welcomeName").textContent = `સ્વાગત છે, ${name}!`;
    message(storeMessage, "સ્ટોરની માહિતી સેવ થઈ ગઈ.");
  } catch (error) {
    console.error(error);
    message(storeMessage, "માહિતી સેવ થઈ નથી. Rules તપાસો.", false);
  }
});

function clearMedicineForm() {
  medicineForm.reset();
  $("medicineId").value = "";
  $("medicineActive").checked = true;
  clearPhoto();

  $("medicineFormTitle").textContent = "નવી દવા ઉમેરો";
  $("saveMedicineButton").textContent = "દવા સેવ કરો";
  cancelEditButton.hidden = true;
}

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

      if (medicine.imageBase64) {
        const image = document.createElement("img");
        image.src = medicine.imageBase64;
        image.alt = medicine.name || "દવાનો ફોટો";
        image.style.width = "110px";
        image.style.height = "110px";
        image.style.objectFit = "contain";
        card.appendChild(image);
      }

      const title = document.createElement("h3");
      title.textContent = medicine.name || "દવાનું નામ નથી";

      const details = document.createElement("p");
      details.textContent =
        `કેટેગરી: ${medicine.category || "-"} | ભાવ: ₹${medicine.price} / ${medicine.unit || "પેક"} | સ્ટોક: ${medicine.stock ?? 0}`;

      const status = document.createElement("p");
      status.textContent = medicine.active
        ? "ગ્રાહકને દેખાય છે"
        : "ગ્રાહકથી છુપાવેલી છે";

      const edit = document.createElement("button");
      edit.type = "button";
      edit.textContent = "ફેરફાર કરો";
      edit.addEventListener("click", () => {
        editMedicine(medicineDoc.id, medicine);
      });

      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "ડિલીટ કરો";

      remove.addEventListener("click", async () => {
        if (!confirm("શું આ દવા ડિલીટ કરવી છે?")) return;

        try {
          await deleteDoc(doc(db, "medicines", medicineDoc.id));
          message(medicineMessage, "દવા ડિલીટ થઈ ગઈ.");
          await loadMedicines();
        } catch (error) {
          console.error(error);
          message(medicineMessage, "દવા ડિલીટ થઈ નથી.", false);
        }
      });

      card.append(title, details, status, edit, remove);
      medicineList.appendChild(card);
    });

  } catch (error) {
    console.error(error);
    medicineList.textContent = "દવાઓ લોડ થઈ શકી નથી. Rules તપાસો.";
  }
}

function editMedicine(id, medicine) {
  $("medicineId").value = id;
  $("medicineName").value = medicine.name || "";
  $("medicineCategory").value = medicine.category || "Other";
  $("medicineInfo").value = medicine.info || "";
  $("medicinePrice").value = medicine.price ?? "";
  $("medicineUnit").value = medicine.unit || "પેક";
  $("medicineStock").value = medicine.stock ?? 0;

  $("prescriptionRequired").checked =
    medicine.prescriptionRequired === true;

  $("medicineActive").checked = medicine.active !== false;

  existingPhoto = medicine.imageBase64 || null;
  selectedPhoto = null;
  photoInput.value = "";
  showPhoto(existingPhoto);

  $("medicineFormTitle").textContent = "દવાની માહિતી બદલો";
  $("saveMedicineButton").textContent = "ફેરફાર સેવ કરો";
  cancelEditButton.hidden = false;

  window.scrollTo({ top: 0, behavior: "smooth" });
}

medicineForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) return;

  const id = value("medicineId");
  const price = Number(value("medicinePrice"));
  const stock = Number(value("medicineStock"));

  if (!Number.isFinite(price) || price < 0 ||
      !Number.isInteger(stock) || stock < 0) {
    message(medicineMessage, "ભાવ અને સ્ટોક યોગ્ય રીતે ભરો.", false);
    return;
  }

  const name = value("medicineName");
  const category = value("medicineCategory");

  if (!name || !category) {
    message(medicineMessage, "દવાનું નામ અને કેટેગરી ભરો.", false);
    return;
  }

  try {
    message(medicineMessage, "દવા સેવ થઈ રહી છે...");

    let imageBase64 = selectedPhoto !== null
      ? selectedPhoto
      : existingPhoto;

    const medicine = {
      name,
      category,
      info: value("medicineInfo"),
      price,
      unit: value("medicineUnit"),
      stock,
      available: stock > 0,
      prescriptionRequired: $("prescriptionRequired").checked,
      active: $("medicineActive").checked,
      ownerUid: currentUser.uid,
      imageBase64: imageBase64 || null,
      updatedAt: serverTimestamp()
    };

    if (id) {
      const reference = doc(db, "medicines", id);
      const existing = await getDoc(reference);

      if (!existing.exists() ||
          existing.data().ownerUid !== currentUser.uid) {
        throw new Error("આ દવા બદલવાની પરવાનગી નથી.");
      }

      await updateDoc(reference, medicine);
      message(medicineMessage, "દવાની માહિતી અને ફોટો સેવ થઈ ગયા.");
    } else {
      await addDoc(collection(db, "medicines"), {
        ...medicine,
        createdAt: serverTimestamp()
      });

      message(medicineMessage, "નવી દવા અને ફોટો સેવ થઈ ગયા.");
    }

    clearMedicineForm();
    await loadMedicines();

  } catch (error) {
    console.error(error);
    message(
      medicineMessage,
      error.message || "દવા સેવ થઈ નથી. Rules અથવા ફોટાનું કદ તપાસો.",
      false
    );
  }
});

cancelEditButton.addEventListener("click", () => {
  clearMedicineForm();
  message(medicineMessage, "ફેરફાર રદ કર્યો.");
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    message(loginMessage, "લોગિન થઈ રહ્યું છે...");

    await signInWithEmailAndPassword(
      auth,
      value("loginEmail"),
      $("loginPassword").value
    );

  } catch (error) {
    console.error(error);
    message(loginMessage, "લોગિન થઈ શક્યું નથી. ઈમેલ અને પાસવર્ડ તપાસો.", false);
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

    if (user) await signOut(auth);
  }
});
