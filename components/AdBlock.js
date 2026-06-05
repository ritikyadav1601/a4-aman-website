export default function AdBlock({ ad }) {
  const name = ad?.khaiwalName || "SATTA KING";
  const whatsapp = ad?.whatsappNumber || "";

  return (
    <>
      <section className="a7-notifications">
        <div className="a7-notification">
          <p>"Now Telegram players can also join our Telegram channel to get results quickly and receive superfast results."</p>
          <a href={`https://wa.me/+${whatsapp}`} target="_blank" rel="noopener noreferrer">JOIN TELEGRAM</a>
        </div>
        <div className="a7-notification">
          <p>"Now WhatsApp players can also join our WhatsApp channel to get results quickly and receive superfast results."</p>
          <a href={`https://wa.me/+${whatsapp}`} target="_blank" rel="noopener noreferrer">JOIN WHATSAPP</a>
        </div>
        <div className="a7-notification">
          <h2>Shri Ganesh Satta King result is updated everyday at 4:40 PM.</h2>
        </div>
        <div className="a7-notification">
          <h2>Sadar Bazar Satta King 2026 Chart is available on A7Satta.com</h2>
        </div>
      </section>
      <section className="a7-ads-container">
        {["AJAY BHAI", "JASSI BHAI", name].map((title) => (
          <article className="a7-ad-card" key={title}>
            <p><strong>--सीधे सट्टा कंपनी का No 1 खाईवाल--</strong></p>
            <p><strong>♕♕ {title} KHAIWAL ♕♕</strong></p>
            <p><strong>⏰ सदर बाजार ----------- 1:30 pm</strong></p>
            <p><strong>⏰ ग्वालियर ------------- 2:30 pm</strong></p>
            <p><strong>⏰ दिल्ली बाजार ---------- 2:50 pm</strong></p>
            <p><strong>⏰ दिल्ली मटका ---------- 3:20 pm</strong></p>
            <p><strong>⏰ श्री गणेश ------------- 4:20 pm</strong></p>
            <p><strong>⏰ फरीदाबाद ------------ 5:50 pm</strong></p>
            <p><strong>⏰ गाज़ियाबाद ----------- 8:50 pm</strong></p>
            <p><strong>⏰ गली ----------------- 11:20 pm</strong></p>
            <p><strong>⏰ दिसावर -------------- 1:30 am</strong></p>
            <p><a href={`https://wa.me/+${whatsapp}`} target="_blank" rel="noopener noreferrer"><strong>Game play करने के लिये नीचे लिंक पर क्लिक करे</strong></a></p>
            <p><a className="a7-whatsapp-pill" href={`https://wa.me/+${whatsapp}`} target="_blank" rel="noopener noreferrer">WhatsApp</a></p>
          </article>
        ))}
      </section>
    </>
  );
}
