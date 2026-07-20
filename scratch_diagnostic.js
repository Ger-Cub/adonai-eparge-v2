// Script de diagnostic utilisant fetch natif (sans dépendance Realtime ou Supabase SDK)
const supabaseUrl = 'https://qzqfdcagmstnxspokcry.supabase.co';
const supabaseAnonKey = 'sb_publishable_SuVukPOuaFY80yfWy8S3zw_NLGO-X3Z';

async function runDiag() {
  console.log("=== Lancement du diagnostic Supabase (Fetch Brut) ===");

  // 1. Connexion Auth
  console.log("1. Authentification...");
  const loginRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': supabaseAnonKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'gerardcubakabisimwa@gmail.com',
      password: '24sept1993'
    })
  });

  const loginData = await loginRes.json();
  if (loginData.error) {
    console.error("Erreur d'authentification:", loginData.error);
    return;
  }

  const userId = loginData.user.id;
  const token = loginData.access_token;
  console.log("Authentifié ! ID utilisateur:", userId);

  // 2. Interroger user_profiles pour son propre id
  console.log("\n2. Lecture du profil id = " + userId);
  const profileRes = await fetch(`${supabaseUrl}/rest/v1/user_profiles?id=eq.${userId}&select=*`, {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${token}`
    }
  });

  console.log("Statut HTTP profil:", profileRes.status, profileRes.statusText);
  try {
    const profileData = await profileRes.json();
    console.log("Données Profil:", profileData);
  } catch (e) {
    console.log("Erreur de parsing JSON pour le profil:", e.message);
  }

  // 3. Interroger tous les profils
  console.log("\n3. Lecture de TOUS les profils visibles...");
  const allRes = await fetch(`${supabaseUrl}/rest/v1/user_profiles?select=*`, {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${token}`
    }
  });

  console.log("Statut HTTP tous profils:", allRes.status, allRes.statusText);
  try {
    const allData = await allRes.json();
    console.log("Nombre de profils reçus:", allData.length);
    console.log("Profils:", allData);
  } catch (e) {
    console.log("Erreur de parsing JSON pour tous les profils:", e.message);
  }
}

runDiag().catch(err => console.error("Erreur inattendue:", err));
