import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy as fsOrderBy,
  limit as fsLimit,
  getDoc,
  type DocumentData,
  type QueryConstraint,
} from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  ref as storageRef,
  getDownloadURL,
  uploadString,
} from "firebase/storage";
import {
  getFirebaseAuth,
  getFirebaseDb,
  getFirebaseStorage,
} from "./config";

const NO_BACKEND_MSG =
  "Firebase غير مهيأ. أضف VITE_FIREBASE_API_KEY و VITE_FIREBASE_PROJECT_ID للتشغيل الكامل. (وضع المعاينة لا يحتاج خادماً)";

// ─── Preview mode stubs ────────────────────────────────────────
function createStubProxy(): any {
  const handler = { data: null as any, error: { message: NO_BACKEND_MSG } };

  const queryChain = (builder: any): any =>
    new Proxy(
      {
        eq: () => queryChain(builder),
        neq: () => queryChain(builder),
        gt: () => queryChain(builder),
        gte: () => queryChain(builder),
        lt: () => queryChain(builder),
        lte: () => queryChain(builder),
        like: () => queryChain(builder),
        ilike: () => queryChain(builder),
        in: () => queryChain(builder),
        order: () => queryChain(builder),
        limit: () => queryChain(builder),
        range: () => queryChain(builder),
        select: () => queryChain({ ...builder, kind: "select" }),
        insert: (data: any) => queryChain({ ...builder, kind: "insert", payload: data }),
        update: (data: any) => queryChain({ ...builder, kind: "update", payload: data }),
        delete: () => queryChain({ ...builder, kind: "delete" }),
        single: async () => ({ data: null, error: null }),
        maybeSingle: async () => ({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
        then: (resolve: any) =>
          resolve({
            data: builder.kind === "select" ? [] : null,
            error: null,
          }),
        returns: () => queryChain(builder),
      },
      {
        get(target: any, prop: string | symbol, receiver: any) {
          if (prop === "then") return target.then;
          if (typeof prop === "string" && prop in target) return (target as any)[prop];
          return receiver;
        },
      },
    );

  const fn: any = async () => handler;
  return new Proxy(fn, {
    get(target, prop: string | symbol, receiver) {
      if (prop === "from") return (table: string) => queryChain({ table, kind: "select" });
      if (prop === "getSession") return async () => ({ data: { session: null }, error: null });
      if (prop === "getUser") return async () => ({ data: { user: null }, error: null });
      if (prop === "signOut") return async () => ({ error: null });
      if (prop === "signInWithPassword") return async () => ({ data: { user: null }, error: null });
      if (prop === "signUp") return async () => ({ data: { user: null }, error: null });
      if (prop === "then") return undefined;
      if (typeof prop === "string" && prop in target) return (target as any)[prop];
      return receiver;
    },
    apply() {
      return fn();
    },
  });
}

// ─── Firestore query chain (real Firebase) ─────────────────────
function firestoreQueryChain(table: string, builder: any): any {
  const db = getFirebaseDb();
  const auth = getFirebaseAuth();
  if (!db) return createStubProxy();

  const filters: QueryConstraint[] = [];
  const pendingFilters: Array<{ op: string; field: string; value: any }> = [];
  let pendingOrderBy: { field: string; direction: "asc" | "desc" } | null = null;
  let pendingLimit: number | null = null;

  const chain: any = {
    eq: (field: string, value: any) => {
      pendingFilters.push({ op: "==", field, value });
      return chain;
    },
    neq: (field: string, value: any) => {
      pendingFilters.push({ op: "!=", field, value });
      return chain;
    },
    gt: (field: string, value: any) => {
      pendingFilters.push({ op: ">", field, value });
      return chain;
    },
    gte: (field: string, value: any) => {
      pendingFilters.push({ op: ">=", field, value });
      return chain;
    },
    lt: (field: string, value: any) => {
      pendingFilters.push({ op: "<", field, value });
      return chain;
    },
    lte: (field: string, value: any) => {
      pendingFilters.push({ op: "<=", field, value });
      return chain;
    },
    like: (field: string, value: any) => {
      pendingFilters.push({ op: ">=", field, value });
      return chain;
    },
    ilike: (field: string, value: any) => {
      pendingFilters.push({ op: ">=", field, value });
      return chain;
    },
    in: (field: string, value: any) => {
      pendingFilters.push({ op: "in", field, value });
      return chain;
    },
    order: (field: string, opts?: { ascending?: boolean }) => {
      pendingOrderBy = { field, direction: opts?.ascending !== false ? "asc" : "desc" };
      return chain;
    },
    limit: (n: number) => {
      pendingLimit = n;
      return chain;
    },
    range: (from: number, to: number) => {
      pendingLimit = to - from + 1;
      return chain;
    },
    select: () => chain,
    insert: (data: any) => {
      const doInsert = async () => {
        const docRef = await addDoc(collection(db, table), data);
        const snap = await getDoc(docRef);
        return { id: snap.id, ...snap.data() };
      };
      return {
        _pendingInsert: data,
        single: async () => {
          try {
            const result = await doInsert();
            return { data: result, error: null };
          } catch (e: any) {
            return { data: null, error: { message: e.message } };
          }
        },
        maybeSingle: async () => {
          try {
            const result = await doInsert();
            return { data: result, error: null };
          } catch (e: any) {
            return { data: null, error: { message: e.message } };
          }
        },
        select: () => ({
          single: async () => {
            try {
              const result = await doInsert();
              return { data: result, error: null };
            } catch (e: any) {
              return { data: null, error: { message: e.message } };
            }
          },
          maybeSingle: async () => {
            try {
              const result = await doInsert();
              return { data: result, error: null };
            } catch (e: any) {
              return { data: null, error: { message: e.message } };
            }
          },
          then: async (resolve: any) => {
            try {
              const result = await doInsert();
              resolve({ data: [result], error: null });
            } catch (e: any) {
              resolve({ data: [], error: { message: e.message } });
            }
          },
        }),
        then: async (resolve: any) => {
          try {
            const result = await doInsert();
            resolve({ data: [result], error: null });
          } catch (e: any) {
            resolve({ data: [], error: { message: e.message } });
          }
        },
      };
    },
    update: (data: any) => {
      const doUpdate = async (filters: Array<{ op: string; field: string; value: any }>) => {
        const q = buildQuery(db, table, filters, null, null);
        const snap = await getDocs(q);
        const updated: any[] = [];
        for (const d of snap.docs) {
          await updateDoc(doc(db, table, d.id), data);
          updated.push({ id: d.id, ...d.data(), ...data });
        }
        return updated;
      };
      return {
        eq: (field: string, value: any) => {
          const filters: Array<{ op: string; field: string; value: any }> = [{ op: "==", field, value }];
          return {
            select: () => ({
              single: async () => {
                try {
                  const q = buildQuery(db, table, filters, null, 1);
                  const snap = await getDocs(q);
                  if (snap.empty) return { data: null, error: { message: "Not found" } };
                  const d = snap.docs[0];
                  await updateDoc(doc(db, table, d.id), data);
                  return { data: { id: d.id, ...d.data(), ...data }, error: null };
                } catch (e: any) {
                  return { data: null, error: { message: e.message } };
                }
              },
            }),
            single: async () => {
              try {
                const q = buildQuery(db, table, filters, null, 1);
                const snap = await getDocs(q);
                if (snap.empty) return { data: null, error: { message: "Not found" } };
                const d = snap.docs[0];
                await updateDoc(doc(db, table, d.id), data);
                return { data: { id: d.id, ...d.data(), ...data }, error: null };
              } catch (e: any) {
                return { data: null, error: { message: e.message } };
              }
            },
            then: async (resolve: any) => {
              try {
                const updated = await doUpdate(filters);
                resolve({ data: updated, error: null });
              } catch (e: any) {
                resolve({ data: [], error: { message: e.message } });
              }
            },
          };
        },
        then: async (resolve: any) => {
          try {
            const q = buildQuery(db, table, [], null, null);
            const snap = await getDocs(q);
            for (const d of snap.docs) {
              await updateDoc(doc(db, table, d.id), data);
            }
            resolve({ data: null, error: null });
          } catch (e: any) {
            resolve({ data: null, error: { message: e.message } });
          }
        },
      };
    },
    delete: () => {
      return {
        eq: (field: string, value: any) => {
          pendingFilters.push({ op: "==", field, value });
          return {
            then: async (resolve: any) => {
              try {
                const q = buildQuery(db, table, pendingFilters, null, null);
                const snap = await getDocs(q);
                for (const d of snap.docs) {
                  await deleteDoc(doc(db, table, d.id));
                }
                resolve({ data: null, error: null });
              } catch (e: any) {
                resolve({ data: null, error: { message: e.message } });
              }
            },
          };
        },
        then: async (resolve: any) => {
          try {
            const q = buildQuery(db, table, pendingFilters, null, pendingLimit);
            const snap = await getDocs(q);
            for (const d of snap.docs) {
              await deleteDoc(doc(db, table, d.id));
            }
            resolve({ data: null, error: null });
          } catch (e: any) {
            resolve({ data: null, error: { message: e.message } });
          }
        },
      };
    },
    single: async () => {
      try {
        const q = buildQuery(db, table, pendingFilters, null, 1);
        const snap = await getDocs(q);
        if (snap.empty) return { data: null, error: null };
        const d = snap.docs[0];
        return { data: { id: d.id, ...d.data() }, error: null };
      } catch (e: any) {
        return { data: null, error: { message: e.message } };
      }
    },
    maybeSingle: async () => {
      try {
        const q = buildQuery(db, table, pendingFilters, null, 1);
        const snap = await getDocs(q);
        if (snap.empty) return { data: null, error: null };
        const d = snap.docs[0];
        return { data: { id: d.id, ...d.data() }, error: null };
      } catch (e: any) {
        return { data: null, error: { message: e.message } };
      }
    },
    then: async (resolve: any) => {
      try {
        const q = buildQuery(db, table, pendingFilters, pendingOrderBy, pendingLimit);
        const snap = await getDocs(q);
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        resolve({ data: rows, error: null });
      } catch (e: any) {
        resolve({ data: [], error: { message: e.message } });
      }
    },
  };

  return chain;
}

function buildQuery(
  db: any,
  table: string,
  filters: Array<{ op: string; field: string; value: any }>,
  orderBy: { field: string; direction: "asc" | "desc" } | null,
  limitN: number | null,
) {
  const constraints: QueryConstraint[] = [];
  for (const f of filters) {
    constraints.push(where(f.field, f.op as any, f.value));
  }
  if (orderBy) {
    constraints.push(fsOrderBy(orderBy.field, orderBy.direction));
  }
  if (limitN) {
    constraints.push(fsLimit(limitN));
  }
  return query(collection(db, table), ...constraints);
}

// ─── Storage helpers ───────────────────────────────────────────
function storageChain(bucket: string) {
  return {
    getPublicUrl: (path: string) => {
      const storage = getFirebaseStorage();
      if (!storage) return { data: { publicUrl: "" } };
      try {
        const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`;
        return { data: { publicUrl: url } };
      } catch {
        return { data: { publicUrl: "" } };
      }
    },
    upload: async (path: string, data: string) => {
      const storage = getFirebaseStorage();
      if (!storage) return { data: { path }, error: { message: NO_BACKEND_MSG } };
      try {
        const ref = storageRef(storage, `${bucket}/${path}`);
        await uploadString(ref, data, "data_url");
        const url = await getDownloadURL(ref);
        return { data: { path, url }, error: null };
      } catch (e: any) {
        return { data: null, error: { message: e.message } };
      }
    },
  };
}

// ─── Auth wrapper ──────────────────────────────────────────────
function authWrapper() {
  const auth = getFirebaseAuth();

  return {
    getSession: async () => {
      if (!auth) return { data: { session: null }, error: null };
      return new Promise((resolve) => {
        const unsub = onAuthStateChanged(auth, (user) => {
          unsub();
          resolve({
            data: {
              session: user ? { user: { id: user.uid, email: user.email } } : null,
            },
            error: null,
          });
        });
        // Timeout fallback
        setTimeout(() => {
          resolve({ data: { session: null }, error: null });
        }, 3000);
      });
    },
    getUser: async () => {
      if (!auth) return { data: { user: null }, error: null };
      const user = auth.currentUser;
      return {
        data: { user: user ? { id: user.uid, email: user.email } : null },
        error: null,
      };
    },
    signInWithPassword: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      if (!auth) return { data: { user: null }, error: { message: NO_BACKEND_MSG } };
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        return {
          data: {
            user: { id: cred.user.uid, email: cred.user.email },
          },
          error: null,
        };
      } catch (e: any) {
        return { data: { user: null }, error: { message: e.message } };
      }
    },
    signUp: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      if (!auth) return { data: { user: null }, error: { message: NO_BACKEND_MSG } };
      try {
        const { createUserWithEmailAndPassword } = await import("firebase/auth");
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        return {
          data: {
            user: { id: cred.user.uid, email: cred.user.email },
          },
          error: null,
        };
      } catch (e: any) {
        return { data: { user: null }, error: { message: e.message } };
      }
    },
    signOut: async () => {
      if (!auth) return { error: null };
      try {
        await fbSignOut(auth);
        return { error: null };
      } catch (e: any) {
        return { error: { message: e.message } };
      }
    },
  };
}

// ─── Main client export ────────────────────────────────────────
function createFirebaseClient(): any {
  const firebaseDb = getFirebaseDb();
  const isConfigured = !!firebaseDb;

  const from = (table: string) => {
    if (!isConfigured) return createStubProxy().from(table);
    return firestoreQueryChain(table, {});
  };

  const auth = authWrapper();
  const storage = {
    from: (bucket: string) => {
      if (!isConfigured) return createStubProxy().storage?.from(bucket) ?? { getPublicUrl: () => ({ data: { publicUrl: "" } }) };
      return storageChain(bucket);
    },
  };

  return {
    from,
    auth,
    storage,
    channel: (name: string) => ({
      on: (_event: string, _opts: any, _callback?: any) => ({
        subscribe: () => ({
          unsubscribe: () => {},
          status: "SUBSCRIBED",
        }),
      }),
      subscribe: () => ({
        unsubscribe: () => {},
        status: "SUBSCRIBED",
      }),
      unsubscribe: () => {},
    }),
    removeChannel: () => {},
    removeAllChannels: () => {},
  };
}

export const supabase: any = createFirebaseClient();
