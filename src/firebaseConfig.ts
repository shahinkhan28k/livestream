/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize the Firebase client SDK (Auth, Firestore)
const app = initializeApp(firebaseConfig);

// CRITICAL: The app will break without this line
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Validate Connection to Firestore on startup as per skill guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firebase client is currently offline or configuration is invalid:", error.message);
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

/**
 * Standard Firebase Firestore Error Handler conformant to skill guidelines.
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  // Safe offline & read-operation preservation
  const isOfflineLike = errInfo.error.includes('offline') || 
                       errInfo.error.includes('Could not reach Cloud Firestore') || 
                       errInfo.error.includes('unavailable') || 
                       errInfo.error.includes('Connection failed') ||
                       errInfo.error.includes('Failed to get document');

  if (operationType === OperationType.GET || isOfflineLike) {
    console.warn(`[FIREBASE RESILIENCE] Supressed throw for offline/GET action to maintain layout rendering: ${errInfo.error}`);
    return;
  }

  throw new Error(JSON.stringify(errInfo));
}

export const firebaseExplanation = {
  authService: "Firebase Authentication",
  dbService: "Cloud Firestore Database",
  rulesPath: "firestore.rules",
  usersCollection: "/users/{userId}",
  destinationsCollection: "/users/{userId}/destinations/{destId}",
  videosCollection: "/users/{userId}/videos/{videoId}",
  schedulesCollection: "/users/{userId}/schedules/{scheduleId}"
};
