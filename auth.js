/**
 * Script de Autenticação de Interface para o Painel Admin
 * Bloqueia a visualização do painel no client-side.
 */

const AUTH_HASH = "f25ad90715f74930e74f0d655733065b43dbd6df022a8ecdf3ab010d297dae01"; // SHA-256
const AUTH_KEY = "admin_auth_passed";

// Utilitário para gerar SHA-256 nativo do navegador
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

document.addEventListener("DOMContentLoaded", () => {
    const loginScreen = document.getElementById("login-screen");
    const appContent = document.getElementById("app");
    const loginInput = document.getElementById("admin-password");
    const loginBtn = document.getElementById("login-btn");
    const loginError = document.getElementById("login-error");

    // Verifica se já passou pela autenticação nesta sessão
    if (sessionStorage.getItem(AUTH_KEY) === "true") {
        unlockApp();
    }

    // Função que desbloqueia a interface
    function unlockApp() {
        if (loginScreen) {
            loginScreen.style.opacity = '0';
            setTimeout(() => {
                loginScreen.style.display = 'none';
            }, 500);
        }
        if (appContent) {
            appContent.style.display = 'flex'; // ou block dependendo do seu layout
            // Ativa um fade-in no app se desejar
            appContent.classList.add('fade-in');
        }
    }

    // Tentar o login
    async function attemptLogin() {
        const password = loginInput.value;
        if (!password) return;

        loginBtn.innerHTML = "<i class='bi bi-arrow-repeat spin'></i>";
        loginBtn.disabled = true;

        const hashedInput = await sha256(password);

        if (hashedInput === AUTH_HASH) {
            // Sucesso
            loginError.style.opacity = '0';
            sessionStorage.setItem(AUTH_KEY, "true");
            unlockApp();
        } else {
            // Falha
            loginError.style.opacity = '1';
            loginError.innerText = "Senha incorreta.";
            loginInput.value = "";

            // Efeito visual de tremor
            loginScreen.querySelector('.login-box').classList.add('shake');
            setTimeout(() => {
                loginScreen.querySelector('.login-box').classList.remove('shake');
            }, 500);

            loginBtn.innerHTML = "<i class='bi bi-arrow-right'></i>";
            loginBtn.disabled = false;
        }
    }

    // Eventos
    if (loginBtn) {
        loginBtn.addEventListener("click", attemptLogin);
    }

    if (loginInput) {
        loginInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                attemptLogin();
            }
        });
    }
});
