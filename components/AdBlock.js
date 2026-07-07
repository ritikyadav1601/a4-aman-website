import { siteConfig } from "@/lib/site-config";
import { FaWhatsapp, FaTelegramPlane } from "react-icons/fa";

export default function AdBlock() {
  const whatsapp = siteConfig.whatsappNumber;
  const khaiwal = siteConfig.khaiwals[0];

  return (
    <>
      <section className="a7-notifications">
        
      <div className="a7-notification">
  <p>
    "Now WhatsApp players can also join our WhatsApp channel to get results
    quickly and receive superfast results."
  </p>

  <a
    href={`https://whatsapp.com/channel/0029Vb7N6II8fewx7GpwN01p`}
    target="_blank"
    rel="noopener noreferrer"
    className="a7-social-btn whatsapp"
  >
    <span className="icon-circle">
      <FaWhatsapp />
    </span>

    <span className="text">
      <strong>WhatsApp</strong>
      <small>Click to chat</small>
    </span>
  </a>
</div>

<div className="a7-notification">
  <p>
    "Now Telegram players can also join our Telegram channel to get results
    quickly and receive superfast results."
  </p>

  <a
    href="https://t.me/faridabadsattafastresult"
    target="_blank"
    rel="noopener noreferrer"
    className="a7-social-btn telegram"
  >
    <span className="icon-circle">
      <FaTelegramPlane />
    </span>

    <span className="text">
      <strong>Telegram</strong>
      <small>Click to connect</small>
    </span>
  </a>
</div>
      </section>
      <section className="a7-ads-container">
        <KhaiwalCard khaiwal={khaiwal} />
      </section>
    </>
  );
}

export function KhaiwalCard({ khaiwal }) {
  return (
    <article className="a7-ad-card">
      <p><strong>--सीधे सट्टा कंपनी का No 1 खाईवाल--</strong></p>
      <p><strong>♕♕ {khaiwal.name} KHAIWAL ♕♕</strong></p>
      <p><strong>⏰ शिव गंगा ------------------ 12:15</strong></p>
      <p><strong>⏰ सबर बाजार ------------ 1:15 pm</strong></p>
      <p><strong>⏰ अलीनगर --------------- 2:15 pm</strong></p>
      <p><strong>⏰ दिल्ली बाज़ार ----------- 2:50 pm</strong></p>
      <p><strong>⏰ श्री गणेश --------------- 4:20 pm</strong></p>
      <p><strong>⏰ फतेहाबाद सिटी ---------- 5:20 pm</strong></p>
      <p><strong>⏰ फरीदाबाद -------------- 5:30 pm</strong></p>
      <p><strong>⏰ मुल्तान बाज़ार ---------- 7:20 pm</strong></p>
      <p><strong>⏰ गाज़ियाबाद ------------ 8:40 pm</strong></p>
      <p><strong>⏰ कल्याणपुरी ------------ 10:10 pm</strong></p>
      <p><strong>⏰ गली ----------------- 11:20 pm</strong></p>
      <p><strong>⏰ दिसावर -------------- 1:30 am</strong></p>
      <p><strong>🤑 Rate list 💸</strong></p>
      <p><strong>जोड़ी रेट 10------- 960</strong></p>
      <p><strong>हरूफ रेट 100----- 960</strong></p>
      <p><a href={`https://wa.me/+${khaiwal.gameplayWhatsapp}`} target="_blank" rel="noopener noreferrer"><strong>Game play करने के लिये नीचे लिंक पर क्लिक करे</strong></a></p>
      <p><a className="a7-whatsapp-pill" href={`https://wa.me/+${khaiwal.whatsappNumber}`} target="_blank" rel="noopener noreferrer">WhatsApp</a></p>
    </article>
  );
}