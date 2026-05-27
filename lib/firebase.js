import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBDNLfsGUk7qYQyuni4eqIWr9owpnhTnpE",
  authDomain: "recipe-app-3644a.firebaseapp.com",
  projectId: "recipe-app-3644a",
  storageBucket: "recipe-app-3644a.appspot.com"
};

const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);