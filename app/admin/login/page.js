import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { createAdminUser } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  await connectDB();
  const hasUsers = (await User.countDocuments()) > 0;
  const error = resolvedSearchParams?.error;

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--site-bg)", padding: 20 }}>
      <div style={{ width: "90%", maxWidth: 450, background: "var(--brand-accent)", padding: 30, borderRadius: 10, boxShadow: "0 30px 60px rgba(17, 24, 39, .22)", textAlign: "center" }}>
        <style>{loginLoaderCss}</style>
        <h2 style={{ color: "var(--site-text)", borderBottom: "2px solid var(--brand-secondary)", display: "inline-block", marginBottom: 25 }}>{hasUsers ? "Admin Login" : "Create Admin"}</h2>
        {error && <p className="text-red-600 font-bold mb-3">Login failed</p>}
        {hasUsers ? (
          <form action="/api/auth/login" method="POST">
            <input type="email" name="email" placeholder="Email" required style={inputStyle} />
            <input type="password" name="password" placeholder="Password" required style={inputStyle} />
            <button type="submit" style={buttonStyle}>Log In</button>
          </form>
        ) : (
          <form action={createAdminUser}>
            <p className="mb-3">No admin user found. Create the first admin account.</p>
            <input name="name" placeholder="Name" defaultValue="Admin" required style={inputStyle} />
            <input type="email" name="email" placeholder="Email" required style={inputStyle} />
            <input type="password" name="password" placeholder="Password" required style={inputStyle} />
            <button type="submit" style={buttonStyle}>Create Admin</button>
          </form>
        )}
      </div>
      <div className="login-loader" id="loginLoader" aria-live="polite" aria-hidden="true">
        <div className="login-loader-box">
          <span className="login-spinner"></span>
          <span>Please wait...</span>
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: `document.addEventListener('submit',function(e){const loader=document.getElementById('loginLoader');if(loader){loader.classList.add('show');loader.setAttribute('aria-hidden','false')}const btn=e.target&&e.target.querySelector('button[type="submit"],button:not([type])');if(btn){btn.disabled=true;btn.style.opacity='.75';btn.style.cursor='wait'}});` }} />
    </main>
  );
}

const inputStyle = {
  backgroundColor: "#ffffff",
  border: "2px solid var(--brand-secondary)",
  borderRadius: 5,
  color: "var(--site-text)",
  display: "block",
  fontSize: 16,
  margin: "8px auto",
  padding: "15px 32px",
  textAlign: "center",
  width: "85%"
};

const buttonStyle = {
  backgroundColor: "var(--brand-primary)",
  border: "none",
  borderRadius: 5,
  color: "var(--on-dark)",
  cursor: "pointer",
  fontSize: 13,
  margin: "20px",
  padding: "15px 80px",
  textTransform: "uppercase"
};

const loginLoaderCss = `
.login-loader {
  align-items: center;
  background: rgba(17, 24, 39, 0.34);
  display: flex;
  inset: 0;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  position: fixed;
  transition: opacity 0.15s ease;
  z-index: 3000;
}
.login-loader.show {
  opacity: 1;
  pointer-events: auto;
}
.login-loader-box {
  align-items: center;
  background: #f9fafb;
  border-radius: 8px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.25);
  color: #111827;
  display: flex;
  font-weight: 600;
  gap: 12px;
  min-width: 190px;
  padding: 18px 22px;
}
.login-spinner {
  animation: login-spin 0.7s linear infinite;
  border: 3px solid #d4af37;
  border-top-color: #111827;
  border-radius: 50%;
  display: inline-block;
  height: 24px;
  width: 24px;
}
@keyframes login-spin {
  to { transform: rotate(360deg); }
}
`;
