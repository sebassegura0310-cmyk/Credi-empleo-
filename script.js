
import { createClient } from
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// REEMPLAZA ESTOS DOS VALORES CON LOS DE TU PROYECTO SUPABASE.
const SUPABASE_URL = "https://mljejvbrjggjncafuqto.supabase.co";
const SUPABASE_KEY = "sb_publishable_mSF8DF9RWAeofaqVyUBRgA_jJ932Xwq";

const configured =
  SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("PEGA_AQUI") &&
  SUPABASE_KEY.length > 20 &&
  !SUPABASE_KEY.includes("PEGA_AQUI");

const db = configured
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

let currentUser = null;
let currentProfile = null;
let authMode = "login";
let peopleCache = [];

const $ = id => document.getElementById(id);

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[char]);
}

function safeImage(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return ["https:", "http:"].includes(parsed.protocol)
      ? escapeHTML(parsed.href) : "";
  } catch {
    return "";
  }
}

function message(id, text = "") {
  $(id).textContent = text;
}

function reportError(id, error) {
  console.error(error);
  message(id, error?.message || "Ocurrió un error. Inténtalo de nuevo.");
}

function formatDate(value) {
  return new Date(value).toLocaleString("es-CO", {
    dateStyle: "medium", timeStyle: "short"
  });
}

function avatar(profile, sizeClass = "avatar") {
  const url = safeImage(profile?.avatar_url);
  const name = escapeHTML(profile?.full_name || profile?.username || "?");
  return url
    ? `<img class="${sizeClass}" src="${url}" alt="Foto de ${name}">`
    : `<div class="${sizeClass}" aria-label="${name}">👤</div>`;
}

function profileName(profile) {
  return escapeHTML(profile?.full_name || profile?.username || "Usuario");
}

function showTab(tab) {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.toggle("hidden", page.id !== tab);
  });
  document.querySelectorAll(".nav-btn").forEach(button => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });
  if (tab === "perfil") loadMyProfile();
  if (tab === "amigos") loadFriends();
  if (tab === "mensajes") loadPeopleForMessages();
}

window.showTab = showTab;

function setAuthMode(mode) {
  authMode = mode;
  const signup = mode === "signup";
  $("nameLabel").classList.toggle("hidden", !signup);
  $("fullName").required = signup;
  $("authSubmit").textContent = signup ? "Crear cuenta" : "Iniciar sesión";
  $("loginTab").classList.toggle("active", !signup);
  $("signupTab").classList.toggle("active", signup);
  $("password").autocomplete = signup ? "new-password" : "current-password";
  message("authMessage", "");
}

$("loginTab").addEventListener("click", () => setAuthMode("login"));
$("signupTab").addEventListener("click", () => setAuthMode("signup"));

$("authForm").addEventListener("submit", async event => {
  event.preventDefault();
  if (!db) {
    message("authMessage", "Primero configura la URL y la clave de Supabase en script.js.");
    return;
  }

  const email = $("email").value.trim();
  const password = $("password").value;
  const fullName = $("fullName").value.trim();
  $("authSubmit").disabled = true;
  message("authMessage", "Procesando...");

  try {
    if (authMode === "signup") {
      const { data, error } = await db.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      });
      if (error) throw error;

      if (!data.session) {
        message("authMessage",
          "Cuenta creada. Revisa tu correo para confirmar el registro y después inicia sesión.");
      } else {
        message("authMessage", "Cuenta creada correctamente.");
      }
    } else {
      const { error } = await db.auth.signInWithPassword({ email, password });
      if (error) throw error;
      message("authMessage", "Sesión iniciada.");
    }
  } catch (error) {
    reportError("authMessage", error);
  } finally {
    $("authSubmit").disabled = false;
  }
});

async function loadMyProfile() {
  if (!currentUser) return;
  const { data, error } = await db.from("profiles")
    .select("*").eq("id", currentUser.id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("No se encontró tu perfil. Revisa la configuración SQL.");
  currentProfile = data;
  $("profileName").value = data.full_name || "";
  $("profileUsername").value = data.username || "";
  $("profileBio").value = data.bio || "";
  $("myProfile").innerHTML = `
    ${data.cover_url ? `<img class="cover" src="${safeImage(data.cover_url)}" alt="Portada">` : ""}
    <div class="profile-large">
      ${avatar(data)}
      <div><strong>${profileName(data)}</strong>
      <p class="muted">@${escapeHTML(data.username)}</p>
      <p>${escapeHTML(data.bio || "")}</p></div>
    </div>`;
}

async function uploadImage(file) {
  if (!file) return null;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Usa una imagen JPG, PNG o WebP.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("La imagen debe pesar máximo 5 MB.");
  }
  const ext = ({ "image/jpeg": "jpg", "image/png": "png",
    "image/webp": "webp" })[file.type];
  const path = `${currentUser.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await db.storage.from("dimytro-photos")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  const { data } = db.storage.from("dimytro-photos").getPublicUrl(path);
  return data.publicUrl;
}

$("profileForm").addEventListener("submit", async event => {
  event.preventDefault();
  if (!currentUser) return;
  message("profileMessage", "Guardando perfil...");
  try {
    const updates = {
      full_name: $("profileName").value.trim(),
      username: $("profileUsername").value.trim().toLowerCase(),
      bio: $("profileBio").value.trim()
    };
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(updates.username)) {
      throw new Error("El usuario debe tener entre 3 y 30 letras, números o guiones bajos.");
    }
    const avatarFile = $("avatarFile").files[0];
    const coverFile = $("coverFile").files[0];
    if (avatarFile) updates.avatar_url = await uploadImage(avatarFile);
    if (coverFile) updates.cover_url = await uploadImage(coverFile);

    const { error } = await db.from("profiles")
      .update(updates).eq("id", currentUser.id);
    if (error) throw error;
    $("avatarFile").value = "";
    $("coverFile").value = "";
    await loadMyProfile();
    message("profileMessage", "Perfil actualizado.");
  } catch (error) {
    reportError("profileMessage", error);
  }
});

$("postForm").addEventListener("submit", async event => {
  event.preventDefault();
  if (!currentUser) return;
  message("postMessage", "Publicando...");
  try {
    const content = $("postText").value.trim();
    const file = $("postImage").files[0];
    if (!content && !file) throw new Error("Escribe algo o selecciona una foto.");
    const image_url = file ? await uploadImage(file) : null;
    const { error } = await db.from("posts").insert({
      user_id: currentUser.id, content, image_url
    });
    if (error) throw error;
    $("postText").value = "";
    $("postImage").value = "";
    message("postMessage", "¡Publicación compartida!");
    await loadFeed();
  } catch (error) {
    reportError("postMessage", error);
  }
});

async function loadFeed() {
  if (!currentUser) return;
  $("feed").innerHTML = '<p class="muted">Cargando publicaciones...</p>';
  const { data: posts, error } = await db.from("posts")
    .select("id,user_id,content,image_url,created_at,profiles!posts_user_id_fkey(id,username,full_name,avatar_url)")
    .order("created_at", { ascending: false }).limit(50);
  if (error) throw error;
  if (!posts?.length) {
    $("feed").innerHTML = '<div class="card">Todavía no hay publicaciones. ¡Comparte la primera!</div>';
    return;
  }

  const rendered = await Promise.all(posts.map(async post => {
    const { data: comments, error: commentError } = await db.from("comments")
      .select("id,content,user_id,created_at,profiles!comments_user_id_fkey(username,full_name,avatar_url)")
      .eq("post_id", post.id).order("created_at").limit(50);
    if (commentError) console.error(commentError);

    const commentHTML = (comments || []).map(comment => `
      <div class="comment">
        <strong>${profileName(comment.profiles)}</strong>
        <span>${escapeHTML(comment.content)}</span>
        ${comment.user_id === currentUser.id
          ? `<button class="secondary delete-comment" data-id="${comment.id}">Eliminar</button>` : ""}
      </div>`).join("");

    return `<article class="card post">
      <div class="post-head">
        ${avatar(post.profiles)}
        <div><div class="post-name">${profileName(post.profiles)}</div>
        <div class="post-date">${formatDate(post.created_at)}</div></div>
        ${post.user_id === currentUser.id
          ? `<button class="secondary delete-post" data-id="${post.id}">Eliminar</button>` : ""}
      </div>
      ${post.content ? `<div class="post-content">${escapeHTML(post.content)}</div>` : ""}
      ${post.image_url ? `<img class="post-image" src="${safeImage(post.image_url)}" alt="Foto publicada" loading="lazy">` : ""}
      <div class="post-actions"><span class="muted">${(comments || []).length} comentarios</span></div>
      <div class="comments">${commentHTML}</div>
      <form class="comment-form" data-post="${post.id}">
        <input name="content" maxlength="1000" placeholder="Escribe un comentario..." required>
        <button class="primary" type="submit">Comentar</button>
      </form>
    </article>`;
  }));
  $("feed").innerHTML = rendered.join("");
}

$("feed").addEventListener("submit", async event => {
  const form = event.target.closest(".comment-form");
  if (!form) return;
  event.preventDefault();
  const content = new FormData(form).get("content").toString().trim();
  if (!content) return;
  const { error } = await db.from("comments").insert({
    post_id: form.dataset.post, user_id: currentUser.id, content
  });
  if (error) return alert(error.message);
  await loadFeed();
});

$("feed").addEventListener("click", async event => {
  const post = event.target.closest(".delete-post");
  const comment = event.target.closest(".delete-comment");
  if (!post && !comment) return;
  if (!confirm("¿Quieres eliminar este elemento?")) return;
  const result = post
    ? await db.from("posts").delete().eq("id", post.dataset.id)
    : await db.from("comments").delete().eq("id", comment.dataset.id);
  if (result.error) return alert(result.error.message);
  await loadFeed();
});

function personHTML(person, buttonHTML = "") {
  return `<div class="person">
    ${avatar(person)}
    <div class="person-info"><strong>${profileName(person)}</strong>
    <div class="muted">@${escapeHTML(person.username)}</div></div>
    ${buttonHTML}
  </div>`;
}

async function loadFriends() {
  if (!currentUser) return;
  $("requests").innerHTML = "Cargando...";
  $("friends").innerHTML = "Cargando...";
  $("people").innerHTML = "Cargando...";
  try {
    const { data: relations, error } = await db.from("friendships")
      .select("*").or(`requester_id.eq.${currentUser.id},addressee_id.eq.${currentUser.id}`);
    if (error) throw error;
    const requests = (relations || []).filter(r =>
      r.status === "pending" && r.addressee_id === currentUser.id);
    const accepted = (relations || []).filter(r => r.status === "accepted");
    const knownIds = new Set((relations || []).map(r =>
      r.requester_id === currentUser.id ? r.addressee_id : r.requester_id));

    const ids = [...new Set([
      ...requests.map(r => r.requester_id),
      ...accepted.map(r => r.requester_id === currentUser.id ? r.addressee_id : r.requester_id)
    ])];
    let profiles = [];
    if (ids.length) {
      const { data, error: e } = await db.from("profiles").select("*").in("id", ids);
      if (e) throw e;
      profiles = data || [];
    }
    const byId = Object.fromEntries(profiles.map(p => [p.id, p]));

    $("requests").innerHTML = requests.length ? requests.map(r =>
      personHTML(byId[r.requester_id],
        `<button class="primary accept-friend" data-id="${r.id}">Aceptar</button>`)).join("")
      : '<p class="muted">No tienes solicitudes pendientes.</p>';

    $("friends").innerHTML = accepted.length ? accepted.map(r => {
      const id = r.requester_id === currentUser.id ? r.addressee_id : r.requester_id;
      return personHTML(byId[id],
        `<button class="secondary chat-person" data-id="${id}">Mensaje</button>`);
    }).join("") : '<p class="muted">Todavía no tienes amigos.</p>';

    const { data: allPeople, error: pe } = await db.from("profiles")
      .select("*").neq("id", currentUser.id).order("username").limit(100);
    if (pe) throw pe;
    peopleCache = allPeople || [];
    $("people").innerHTML = peopleCache.map(p => {
      let action = "";
      if (knownIds.has(p.id)) {
        action = '<span class="muted">Solicitud existente o amigo</span>';
      } else {
        action = `<button class="primary add-friend" data-id="${p.id}">Agregar</button>`;
      }
      return personHTML(p, action);
    }).join("") || '<p class="muted">Aún no hay otros usuarios.</p>';
  } catch (error) {
    reportError("globalMessage", error);
  }
}

$("amigos").addEventListener("click", async event => {
  const accept = event.target.closest(".accept-friend");
  const add = event.target.closest(".add-friend");
  const chatButton = event.target.closest(".chat-person");
  try {
    if (accept) {
      const { error } = await db.from("friendships")
        .update({ status: "accepted" }).eq("id", accept.dataset.id);
      if (error) throw error;
      await loadFriends();
    } else if (add) {
      const { error } = await db.from("friendships").insert({
        requester_id: currentUser.id,
        addressee_id: add.dataset.id,
        status: "pending"
      });
      if (error) throw error;
      await loadFriends();
    } else if (chatButton) {
      showTab("mensajes");
      await loadPeopleForMessages();
      $("messagePerson").value = chatButton.dataset.id;
      await loadChat();
    }
  } catch (error) {
    reportError("globalMessage", error);
  }
});

async function loadPeopleForMessages() {
  if (!currentUser) return;
  const { data, error } = await db.from("profiles")
    .select("id,username,full_name").neq("id", currentUser.id)
    .order("username").limit(100);
  if (error) throw error;
  const select = $("messagePerson");
  const previous = select.value;
  select.innerHTML = '<option value="">Elige un usuario</option>' +
    (data || []).map(p => `<option value="${p.id}">${escapeHTML(p.full_name || p.username)} (@${escapeHTML(p.username)})</option>`).join("");
  if ((data || []).some(p => p.id === previous)) select.value = previous;
}

$("messagePerson").addEventListener("change", loadChat);

async function loadChat() {
  const otherId = $("messagePerson").value;
  $("chat").innerHTML = "";
  if (!otherId || !currentUser) return;
  const { data, error } = await db.from("messages")
    .select("*")
    .or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${currentUser.id})`)
    .order("created_at", { ascending: true }).limit(100);
  if (error) {
    reportError("messageStatus", error);
    return;
  }
  $("chat").innerHTML = (data || []).map(m => `
    <div class="bubble ${m.sender_id === currentUser.id ? "mine" : ""}">
      ${escapeHTML(m.content)}
      <small>${formatDate(m.created_at)}</small>
    </div>`).join("");
  $("chat").scrollTop = $("chat").scrollHeight;
}

$("messageForm").addEventListener("submit", async event => {
  event.preventDefault();
  const recipient_id = $("messagePerson").value;
  const content = $("messageText").value.trim();
  if (!recipient_id || !content) {
    message("messageStatus", "Selecciona una persona y escribe un mensaje.");
    return;
  }
  message("messageStatus", "Enviando...");
  const { error } = await db.from("messages").insert({
    sender_id: currentUser.id, recipient_id, content
  });
  if (error) {
    reportError("messageStatus", error);
    return;
  }
  $("messageText").value = "";
  message("messageStatus", "Mensaje enviado.");
  await loadChat();
});

$("searchBtn").addEventListener("click", async () => {
  const term = $("searchUsers").value.trim();
  if (!term || !currentUser) return;
  showTab("amigos");
  try {
    const { data, error } = await db.from("profiles").select("*")
      .or(`username.ilike.%${term.replace(/[%_,]/g, "")}%,full_name.ilike.%${term.replace(/[%_,]/g, "")}%`)
      .neq("id", currentUser.id).limit(30);
    if (error) throw error;
    peopleCache = data || [];
    $("people").innerHTML = peopleCache.map(p =>
      personHTML(p, `<button class="primary add-friend" data-id="${p.id}">Agregar</button>`)).join("")
      || '<p>No se encontraron personas.</p>';
  } catch (error) {
    reportError("globalMessage", error);
  }
});

$("searchUsers").addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    $("searchBtn").click();
  }
});

document.querySelectorAll(".nav-btn").forEach(button => {
  button.addEventListener("click", () => showTab(button.dataset.tab));
});

$("logoutBtn").addEventListener("click", async () => {
  const { error } = await db.auth.signOut();
  if (error) reportError("globalMessage", error);
});

async function updateSession(session) {
  currentUser = session?.user || null;
  $("authView").classList.toggle("hidden", !!currentUser);
  $("appView").classList.toggle("hidden", !currentUser);
  $("logoutBtn").classList.toggle("hidden", !currentUser);

  if (!currentUser) {
    currentProfile = null;
    $("feed").innerHTML = "";
    return;
  }

  try {
    await loadMyProfile();
    await loadFeed();
    showTab("inicio");
  } catch (error) {
    reportError("globalMessage", error);
  }
}

if (!db) {
  message("authMessage",
    "Falta configurar SUPABASE_URL y SUPABASE_KEY en script.js.");
} else {
  db.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => updateSession(session), 0);
  });
  db.auth.getSession().then(({ data, error }) => {
    if (error) reportError("authMessage", error);
    else updateSession(data.session);
  });
}
