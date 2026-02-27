import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyA3FuyrvaiF9dV7G9mQc6rOJGJRKPd3XY8",
    authDomain: "controle-clientes-eca98.firebaseapp.com",
    projectId: "controle-clientes-eca98",
    storageBucket: "controle-clientes-eca98.firebasestorage.app",
    messagingSenderId: "602197109446",
    appId: "1:602197109446:web:12c0be004b9491dace85c7"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
