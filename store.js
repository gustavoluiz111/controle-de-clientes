import { db } from './firebase.js';
import {
  collection,
  getDocs,
  setDoc,
  doc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDoc
} from "firebase/firestore";

// Collection Names
const COLLECTIONS = {
  CUSTOMERS: 'customers',
  SERVICES: 'services',
  SETTINGS: 'settings'
};

const DEFAULT_SERVICES = [
  { id: 1, name: 'Globoplay + Canais', cost: 7, suggested: 20, marketPrice: 54.90 },
  { id: 2, name: 'Globoplay + Canais + Telecine', cost: 8, suggested: 25, marketPrice: 69.90 },
  { id: 3, name: 'Globoplay + Canais + Premiere', cost: 8, suggested: 30, marketPrice: 89.90 },
  { id: 4, name: 'Claro tv+', cost: 8, suggested: 25, marketPrice: 59.90 },
  { id: 5, name: 'Premiere', cost: 6, suggested: 12, marketPrice: 59.90 },
  { id: 6, name: 'HBO Max Premium', cost: 10, suggested: 18, marketPrice: 34.90 },
  { id: 7, name: 'Disney Premium', cost: 10, suggested: 18, marketPrice: 33.90 },
  { id: 8, name: 'Paramount+', cost: 7, suggested: 12.50, marketPrice: 19.90 },
  { id: 9, name: 'Prime Video', cost: 6, suggested: 11, marketPrice: 14.90 },
  { id: 10, name: 'Prime Video + 5 adicionais', cost: 12.90, suggested: 20.40, marketPrice: 50.00 },
  { id: 11, name: 'Prime Video + 9 adicionais', cost: 16.90, suggested: 26.40, marketPrice: 70.00 },
  { id: 12, name: 'PlayPlus', cost: 8, suggested: 14, marketPrice: 15.90 },
  { id: 13, name: 'ChatGPT', cost: 19.90, suggested: 40, marketPrice: 99.00 },
  { id: 14, name: 'YouTube Premium (Anual)', cost: 65, suggested: 120, marketPrice: 249.00 },
  { id: 15, name: 'Canva Pro (Anual)', cost: 55, suggested: 100, marketPrice: 289.00 },
  { id: 16, name: 'Produto digital', cost: 10, suggested: 25, marketPrice: 40.00 }
];

const DEFAULT_SETTINGS = {
  pixKey: 'Sua Chave PIX Aqui'
};

// Local cache
let customersCache = [];
let servicesCache = [];
let settingsCache = null;

export const DataStore = {
  // Listeners for real-time updates
  subscribeCustomers(callback) {
    const q = query(collection(db, COLLECTIONS.CUSTOMERS), orderBy('name'));
    return onSnapshot(q, (snapshot) => {
      customersCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(customersCache);
    }, (error) => {
      console.error("Firestore Subscribe Error:", error);
    });
  },

  async getCustomers() {
    if (customersCache.length > 0) return customersCache;
    try {
      const q = query(collection(db, COLLECTIONS.CUSTOMERS), orderBy('name'));
      const snapshot = await getDocs(q);
      customersCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error("Error getting customers:", e);
    }
    return customersCache;
  },

  async saveCustomer(customer) {
    const id = customer.id ? String(customer.id) : String(Date.now());
    await setDoc(doc(db, COLLECTIONS.CUSTOMERS, id), customer);
  },

  async deleteCustomer(id) {
    await deleteDoc(doc(db, COLLECTIONS.CUSTOMERS, String(id)));
  },

  async getServices() {
    if (servicesCache.length > 0) return servicesCache;
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.SERVICES));
      if (snapshot.empty) {
        // Seed initial services
        for (const service of DEFAULT_SERVICES) {
          await setDoc(doc(db, COLLECTIONS.SERVICES, String(service.id)), service);
        }
        servicesCache = DEFAULT_SERVICES;
      } else {
        servicesCache = snapshot.docs.map(doc => doc.data());
      }
    } catch (e) {
      console.error("Error getting services:", e);
      return DEFAULT_SERVICES; // Fallback to default
    }
    return servicesCache;
  },

  async getSettings() {
    if (settingsCache) return settingsCache;
    try {
      const docRef = doc(db, COLLECTIONS.SETTINGS, 'admin');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        settingsCache = docSnap.data();
      } else {
        await setDoc(docRef, DEFAULT_SETTINGS);
        settingsCache = DEFAULT_SETTINGS;
      }
    } catch (e) {
      console.error("Error getting settings:", e);
      return DEFAULT_SETTINGS;
    }
    return settingsCache;
  },

  async saveSettings(settings) {
    await setDoc(doc(db, COLLECTIONS.SETTINGS, 'admin'), settings);
    settingsCache = settings;
  }
};
