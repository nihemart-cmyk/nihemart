import React, { createContext, useContext, useState, ReactNode } from "react";

export type Language = "en" | "rw";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

// Translation data
const translations = {
  en: {
    // Navigation
    "nav.home": "Home",
    "nav.products": "Products",
    "nav.about": "About",
    "nav.contact": "Contact",
    "nav.cart": "Cart",
    "nav.orders": "Orders",
    "nav.profile": "Profile",
    "nav.admin": "Admin",
    "nav.login": "Login",
    "nav.register": "Register",
    "nav.logout": "Logout",

    // Homepage
    "home.hero.title": "Welcome to NiheMart",
    "home.hero.learnmore": "Learn More",
    "home.hero.subtitle": "Your premier online marketplace in Rwanda",
    "home.hero.cta": "Shop Now",
    "home.featured": "Featured Products",
    "home.categories": "Shop by Category",
    "home.premium": "Discover our premium products at unbeatable prices",
    "home.categories.description":
      "Find exactly what you need across various categories",
    "home.viewall": "View all products",
    "home.customers": "What Our Customers Say",
    "home.customers.description":
      "Read what our satisfied customers have to say about their experience with NiheMart",

    // Products
    "products.title": "Products",
    "products.search": "Search products...",
    "products.filter": "Filter",
    "products.sort": "Sort",
    "products.addToCart": "Add to Cart",
    "products.outOfStock": "Out of Stock",
    "products.viewDetails": "View Details",

    // Cart
    "cart.title": "Shopping Cart",
    "cart.empty": "Your cart is empty",
    "cart.total": "Total",
    "cart.checkout": "Checkout",
    "cart.remove": "Remove",
    "cart.quantity": "Quantity",
    "cart.continue": "Continue shopping",
    "cart.addProducts": "Add some products to get started!",
    "cart.order": "Place order!",

    // Checkout page
    "checkout.title": "Checkout",
    "checkout.orderInfo": "Order Information",
    "checkout.email": "Email",
    "checkout.firstName": "First Name",
    "checkout.lastName": "Last Name",
    "checkout.address": "Address",
    "checkout.city": "City",
    "checkout.phone": "Phone",
    "checkout.orderSummary": "Order Summary",
    "checkout.subtotal": "Subtotal",
    "checkout.tax": "Transport fee",
    "checkout.shipping": "Shipping",
    "checkout.total": "Total",
    "checkout.placeOrder": "Place Order",

    // Auth
    "auth.login.title": "Login to Your Account",
    "auth.register.title": "Create Account",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.confirmPassword": "Confirm Password",
    "auth.fullName": "Full Name",
    "auth.phone": "Phone Number",

    // Admin
    "admin.dashboard": "Admin Dashboard",
    "admin.dashboard.welcome":
      "Welcome to your admin dashboard. Here you can manage products, orders, and users.",
    "admin.stats.products": "Products",
    "admin.stats.active": "Active",
    "admin.stats.featured": "Featured",
    "admin.stats.orders": "Orders",
    "admin.stats.completed": "Completed",
    "admin.stats.revenue": "Revenue",
    "admin.stats.users": "Users",
    "admin.stats.fromLastMonth": "from last month",
    "admin.recentOrders": "Recent Orders",
    "admin.viewAll": "View All",
    "admin.item": "item",
    "admin.items": "items",
    "admin.status.completed": "Completed",
    "admin.status.processing": "Processing",
    "admin.status.shipped": "Shipped",
    "admin.status.pending": "Pending",
    "admin.topProducts": "Top Products",
    "admin.inStock": "in stock",
    "admin.featured": "Featured",
    "admin.quickActions": "Quick Actions",
    "admin.addProduct": "Add Product",
    "admin.bulkAdd": "Add Bulk Product",
    "admin.viewOrders": "View Orders",
    "admin.manageUsers": "Manage Users",
    "admin.viewAnalytics": "View Analytics",
    "admin.products": "Products",
    "admin.orders": "Orders",
    "admin.notifications": "Notifications",
    "admin.settings": "Settings",

    // Common
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.edit": "Edit",
    "common.delete": "Delete",
    "common.view": "View",
    "common.back": "Back",
    "common.next": "Next",
    "common.previous": "Previous",
    "common.loading": "Loading...",
    "common.error": "Error",
    "common.success": "Success",

    // Footer
    "footer.quickLinks": "Quick Links",
    "footer.customerService": "Customer Service",
    "footer.contactUs": "Contact Us",
    "footer.helpCenter": "Help Center",
    "footer.returns": "Returns & Exchanges",
    "footer.shipping": "Shipping Info",
    "footer.terms": "Terms of Service",
    "footer.rights": "© 2025 NiheMart. All rights reserved.",

    // Hero Carousel
    "hero.slide1.title": "Welcome to NiheMart",
    "hero.slide1.subtitle": "Your premier online marketplace in Rwanda",
    "hero.slide2.title": "Latest Electronics",
    "hero.slide2.subtitle":
      "Discover cutting-edge technology at unbeatable prices",
    "hero.slide3.title": "Fashion & Style",
    "hero.slide3.subtitle":
      "Trendy clothing and accessories for every occasion",

    // Features
    "features.secure.title": "Secure Shopping",
    "features.secure.description":
      "Your data and payments are completely secure",
    "features.delivery.title": "Fast Delivery",
    "features.delivery.description":
      "Free delivery within Kigali, nationwide shipping available",
    "features.support.title": "24/7 Support",
    "features.support.description":
      "Get help whenever you need it with our customer support",

    // Chatbot
    "chatbot.title": "Chat Support",
    "chatbot.placeholder": "Type your message or upload an image...",
    "chatbot.send": "Send",
    "chatbot.close": "Close chat",
    "chatbot.welcome": "Hello! How can I help you with NiheMart today?",

    // Contact Page
    "contact.hero":
      "We'd love to hear from you. Get in touch with our team for any questions or support.",
    "contact.formTitle": "Send us a Message",
    "contact.fullName": "Full Name",
    "contact.emailLabel": "Email",
    "contact.subject": "Subject",
    "contact.message": "Message",
    "contact.send": "Send Message",
    "contact.getInTouch": "Get in Touch",
    "contact.getInTouchDesc":
      "Have questions about our products or services? Our team is here to help you with anything you need. Reach out through any of the channels below.",
    "contact.address": "Address",
    "contact.addressContent": "Kigali, Rwanda\nKN 4 Ave, Nyarugenge",
    "contact.phone": "Phone",
    "contact.phoneContent": "+250 788 123 456\n+250 722 987 654",
    "contact.email": "Email",
    "contact.emailContent": "info@nihemart.rw\nsupport@nihemart.rw",
    "contact.hours": "Business Hours",
    "contact.hoursContent":
      "Mon - Fri: 8:00 AM - 6:00 PM\nSat - Sun: 9:00 AM - 5:00 PM",
    "contact.faqTitle": "Frequently Asked Questions",
    "contact.faqDesc": "Quick answers to common questions",
    "contact.faq1.q": "What are your delivery times?",
    "contact.faq1.a":
      "We deliver within Kigali in 1-2 business days and nationwide within 3-5 business days.",
    "contact.faq2.q": "Do you offer returns?",
    "contact.faq2.a":
      "Yes, we offer 30-day returns for most products in original condition.",
    "contact.faq3.q": "What payment methods do you accept?",
    "contact.faq3.a":
      "We accept mobile money, bank transfers, and cash on delivery.",
    "contact.faq4.q": "Is customer support available in Kinyarwanda?",
    "contact.faq4.a":
      "Yes, our support team is fluent in both English and Kinyarwanda.",

    // About Page
    "about.title": "About NiheMart",
    "about.hero":
      "Empowering Rwanda's digital commerce revolution with innovative technology and unwavering commitment to customer satisfaction.",
    "about.storyTitle": "Our Story",
    "about.story1":
      "Founded in 2024, NiheMart emerged from a simple vision: to create Rwanda's most trusted and accessible e-commerce platform. We recognized the growing need for a reliable online marketplace that serves the unique needs of Rwandan consumers.",
    "about.story2":
      "Starting with a small team of passionate individuals, we've grown into a comprehensive platform offering thousands of products from electronics to fashion, home goods to sports equipment.",
    "about.story3":
      "Today, we're proud to serve customers across Rwanda, providing fast delivery, competitive prices, and exceptional customer service in both English and Kinyarwanda.",
    "about.teamworkImgAlt": "Team collaboration",
    "about.valuesTitle": "Our Values",
    "about.valuesDesc": "The principles that guide everything we do",
    "about.values.mission.title": "Our Mission",
    "about.values.mission.desc":
      "To provide Rwandans with access to quality products at affordable prices through our innovative e-commerce platform.",
    "about.values.customer.title": "Customer First",
    "about.values.customer.desc":
      "We prioritize customer satisfaction by offering exceptional service, fast delivery, and reliable support.",
    "about.values.quality.title": "Quality Products",
    "about.values.quality.desc":
      "We carefully curate our product selection to ensure every item meets our high standards of quality and value.",
    "about.values.local.title": "Local Impact",
    "about.values.local.desc":
      "Supporting local businesses and contributing to Rwanda's digital economy growth and development.",
    "about.teamTitle": "Meet Our Team",
    "about.teamDesc": "The passionate people behind NiheMart",
    "about.team.ceo": "CEO & Founder",
    "about.team.ceoDesc":
      "Visionary leader with 10+ years in e-commerce and technology.",
    "about.team.cto": "CTO",
    "about.team.ctoDesc":
      "Technology expert passionate about building scalable solutions.",
    "about.team.ops": "Head of Operations",
    "about.team.opsDesc":
      "Operations specialist ensuring smooth delivery and logistics.",
    "about.stats.customers": "Happy Customers",
    "about.stats.products": "Products Available",
    "about.stats.partners": "Brand Partners",
    "about.stats.satisfaction": "Customer Satisfaction",
  },
  rw: {
    // Navigation
    "nav.home": "Ahabanza",
    "nav.products": "Ibicuruzwa",
    "nav.about": "Ibyerekeye Twe",
    "nav.contact": "Twandikire",
    "nav.cart": "Igikoni",
    "nav.orders": "Komande",
    "nav.profile": "Umwirondoro",
    "nav.admin": "Admin",
    "nav.login": "Injira",
    "nav.register": "Iyandikishe",
    "nav.logout": "Sohoka",

    // Homepage
    "home.hero.title": "Murakaza neza kuri NiheMart",
    "home.hero.learnmore": "Menya byinshi",
    "home.hero.subtitle": "Isoko rya mbere ryo kuri Murandasi mu Rwanda",
    "home.hero.cta": "Tangira Kugura",
    "home.featured": "Ibicuruzwa Bigezweho",
    "home.premium": "Ibicuruzwa byiza bigezweho ku biciro byiza",
    "home.categories": "Gura ukurikije Ibyiciro",
    "home.categories.description":
      "Bona neza ibyo ukeneye byose mu byiciro bitandukanye",
    "home.viewall": "Reba ibicuruzwa byose",
    "home.customers": "Ibyo abakiriya bavuga",
    "home.customers.description":
      "Soma ibyo abakiriya bacu banyuzwe bavuga kuri serivisi Nihemart itanga",

    // Products
    "products.title": "Ibicuruzwa",
    "products.search": "Shakisha ibicuruzwa...",
    "products.filter": "Shiraho",
    "products.sort": "Shiraho",
    "products.addToCart": "Shira mu gatebo",
    "products.outOfStock": "Ntibihari",
    "products.viewDetails": "Reba Amakuru",

    // Cart
    "cart.title": "Agatebo kawe",
    "cart.empty": "Ntakintu kiri mu gatebo",
    "cart.total": "Igiteranyo",
    "cart.checkout": "Kwishyura",
    "cart.remove": "Vamo",
    "cart.quantity": "Ingano",
    "cart.continue": "Komeza guhaha",
    "cart.addProducts": "Ongeramo ibicuruzwa kugirango utangire!",
    "cart.order": "Tumiza!",

    // Checkout
    "checkout.title": "Kwishyura",
    "checkout.orderInfo": "Amakuru ya Komande",
    "checkout.email": "Imeyili",
    "checkout.firstName": "Izina rya mbere",
    "checkout.lastName": "Izina rya nyuma",
    "checkout.address": "Aderesi",
    "checkout.city": "Umujyi",
    "checkout.phone": "Telefoni",
    "checkout.orderSummary": "Ibyerekeye Komande",
    "checkout.subtotal": "Igiteranyo",
    "checkout.tax": "Ayo kubikugezaho",
    "checkout.shipping": "Kohereza",
    "checkout.total": "Igiteranyo",
    "checkout.placeOrder": "Shyira Iteka",

    // Auth
    "auth.login.title": "Injira mu Konti yawe",
    "auth.register.title": "Kora Konti",
    "auth.email": "Imeyili",
    "auth.password": "Ijambo ryibanga",
    "auth.confirmPassword": "Emeza Ijambo ryibanga",
    "auth.fullName": "Amazina yose",
    "auth.phone": "Telefoni",

    // Admin
    "admin.dashboard": "Dashboard y'Umuyobozi",
    "admin.dashboard.welcome":
      "Murakaza neza kuri dashboard y'umuyobozi. Ushobora gucunga ibicuruzwa, komande n'abakoresha hano.",
    "admin.stats.products": "Ibicuruzwa",
    "admin.stats.active": "Bikora",
    "admin.stats.featured": "Byamamaye",
    "admin.stats.orders": "Komande",
    "admin.stats.completed": "Byarangiye",
    "admin.stats.revenue": "Inyungu",
    "admin.stats.users": "Abakoresha",
    "admin.stats.fromLastMonth": "uheruka ukwezi gushize",
    "admin.recentOrders": "Komande ziheruka",
    "admin.viewAll": "Reba byose",
    "admin.item": "igicuruzwa",
    "admin.items": "ibicuruzwa",
    "admin.status.completed": "Byarangiye",
    "admin.status.processing": "Birimo gutunganywa",
    "admin.status.shipped": "Byoherejwe",
    "admin.status.pending": "Birategereje",
    "admin.topProducts": "Ibicuruzwa byamamaye",
    "admin.inStock": "bihari",
    "admin.featured": "Byamamaye",
    "admin.quickActions": "Ibikorwa Byihuse",
    "admin.addProduct": "Ongeramo Igicuruzwa",
    "admin.bulkAdd": "Ongeramo Byinshi",
    "admin.viewOrders": "Reba Komande",
    "admin.manageUsers": "Cunga Abakoresha",
    "admin.viewAnalytics": "Reba Ibisubizo",
    "admin.products": "Ibicuruzwa",
    "admin.orders": "Komande",
    "admin.notifications": "Ubutumwa",

    // Common
    "common.save": "Bika",
    "common.cancel": "Hagarika",
    "common.edit": "Hindura",
    "common.delete": "Siba",
    "common.view": "Reba",
    "common.back": "Subira",
    "common.next": "Ikurikira",
    "common.previous": "Ikibanziriza",
    "common.loading": "Birimo gutegurwa...",
    "common.error": "Ikosa",
    "common.success": "Byagenze neza",

    // Footer
    "footer.quickLinks": "Ibyihutirwa",
    "footer.customerService": "Serivisi y'Abakiriya",
    "footer.contactUs": "Twandikire",
    "footer.helpCenter": "Aho mufashirizwa",
    "footer.returns": "Kugaruza ibyabuze",
    "footer.shipping": "Amakuru ya komande",
    "footer.terms": "Amategeko y'Ikoreshwa",
    "footer.rights": "© 2025 NiheMart. Uburenganzira bwose burakurikizwa.",

    // Hero Carousel
    "hero.slide1.title": "Murakaza neza kuri NiheMart",
    "hero.slide1.subtitle": "Isoko rya mbere ryo kuri Murandasi mu Rwanda",
    "hero.slide2.title": "Ibikoresho by'ikoranabuhanga bigezweho",
    "hero.slide2.subtitle":
      "Urabona ibikoresho by'ikoranabuhanga bigezweho ku biciro byiza",
    "hero.slide3.title": "Imyenda n'Ubwiza",
    "hero.slide3.subtitle":
      "Imyenda igezweho, imiringa ndetse n'ibindi bikoresho by'ubwiza",

    // Features
    "features.secure.title": "Kugura bitekanye",
    "features.secure.description":
      "Amakuru yawe n'amafaranga yawe bifite umutekano wuzuye",
    "features.delivery.title": "Tubikugezaho byihuse",
    "features.delivery.description":
      "Tubikugezaho kubuntu i Kigali, no mu ntara biba byihuse",
    "features.support.title": "Ubufasha 24/7",
    "features.support.description": "Ubufasha buboneka igihe cyose ukeneye",

    // Chatbot
    "chatbot.title": "Ubufasha bw'Ikiganiro",
    "chatbot.placeholder": "Andika ubutumwa bwawe cyangwa ushyire ishusho...",
    "chatbot.send": "Ohereza",
    "chatbot.close": "Funga ikiganiro",
    "chatbot.welcome": "Muraho! Nakugufasha nde kuri NiheMart uyu munsi?",

    // Contact Page
    "contact.hero":
      "Twishimiye kumva ibitekerezo byawe. Twandikire niba hari ikibazo cyangwa ukeneye ubufasha.",
    "contact.formTitle": "Ohereza Ubutumwa",
    "contact.fullName": "Amazina yose",
    "contact.emailLabel": "Imeyili",
    "contact.subject": "Impamvu",
    "contact.message": "Ubutumwa",
    "contact.send": "Ohereza Ubutumwa",
    "contact.getInTouch": "Twandikire",
    "contact.getInTouchDesc":
      "Ufite ikibazo cyangwa ushaka kumenya byinshi kuri serivisi zacu? Itsinda ryacu rihora ryiteguye kugufasha. Twandikire ukoresheje uburyo ubona bukworoheye.",
    "contact.address": "Aderesi",
    "contact.addressContent": "Kigali, Rwanda\nKN 4 Ave, Nyarugenge",
    "contact.phone": "Telefoni",
    "contact.phoneContent": "+250 788 123 456\n+250 722 987 654",
    "contact.email": "Imeyili",
    "contact.emailContent": "info@nihemart.rw\nsupport@nihemart.rw",
    "contact.hours": "Amasaha y'Akazi",
    "contact.hoursContent":
      "Kuwa Mbere - Kuwa Gatanu: 8:00 AM - 6:00 PM\nKuwa Gatandatu - Ku Cyumweru: 9:00 AM - 5:00 PM",
    "contact.faqTitle": "Ibibazo Bikunze Kubazwa",
    "contact.faqDesc": "Ibisubizo byihuse ku bibazo bikunze kubazwa",
    "contact.faq1.q": "Ni ryari mutanga ibicuruzwa?",
    "contact.faq1.a":
      "Dutanga ibicuruzwa i Kigali hagati y'iminsi 1-2 y'akazi, no mu gihugu hose hagati y'iminsi 3-5.",
    "contact.faq2.q": "Ese mushobora kwakira ibigaruwe?",
    "contact.faq2.a":
      "Yego, wemerewe kugarura ibicuruzwa byinshi mu minsi 30 bikiri uko byari bimeze.",
    "contact.faq3.q": "Ni ubuhe buryo bwo kwishyura bwemewe?",
    "contact.faq3.a":
      "Twemera Mobile Money, kubikuza kuri banki, ndetse no kwishyura ku gicuruzwa kigeze.",
    "contact.faq4.q": "Ese ubufasha butangwa no mu Kinyarwanda?",
    "contact.faq4.a":
      "Yego, itsinda ryacu ritanga ubufasha mu Cyongereza no mu Kinyarwanda.",

    // About Page
    "about.title": "Ibyerekeye NiheMart",
    "about.hero":
      "Duteza imbere ubucuruzi bwa murandasi mu Rwanda binyuze mu ikoranabuhanga rigezweho n'ubwitange bwo kunezeza abakiriya.",
    "about.storyTitle": "Inkomoko Yacu",
    "about.story1":
      "Yashinzwe mu 2024, NiheMart yatangijwe n'icyerekezo cyoroshye: gutanga isoko ryo kuri murandasi ryizewe kandi riboneka kuri bose mu Rwanda. Twabonye ko hakenewe urubuga rwizewe ruhuza abaguzi n'abacuruzi b'Abanyarwanda.",
    "about.story2":
      "Twatangiriye ku itsinda rito ry'inzobere, none ubu dutanga ibicuruzwa ibihumbi kuva ku ikoranabuhanga, imyenda, ibikoresho byo mu rugo n'imikino.",
    "about.story3":
      "Ubu, twishimira gukorera abakiriya mu Rwanda hose, tubagezaho serivisi zihuse, ibiciro byiza, n'ubufasha buhebuje mu Cyongereza no mu Kinyarwanda.",
    "about.teamworkImgAlt": "Ubufatanye bw'itsinda",
    "about.valuesTitle": "Indangagaciro Zacu",
    "about.valuesDesc": "Ibyo twubahiriza mu mikorere yacu ya buri munsi",
    "about.values.mission.title": "Inshingano Zacu",
    "about.values.mission.desc":
      "Gutanga amahirwe ku Banyarwanda yo kubona ibicuruzwa byiza ku giciro cyiza binyuze mu ikoranabuhanga rigezweho.",
    "about.values.customer.title": "Umukiriya Ku Isonga",
    "about.values.customer.desc":
      "Dushyira umukiriya imbere, dutanga serivisi nziza, gutanga vuba, n'ubufasha bwizewe.",
    "about.values.quality.title": "Ibicuruzwa Byujuje Ibisabwa",
    "about.values.quality.desc":
      "Duhitamo neza ibicuruzwa byose kugira ngo byuzuze ubuziranenge n'agaciro.",
    "about.values.local.title": "Guteza Imbere Abenegihugu",
    "about.values.local.desc":
      "Dushyigikira ubucuruzi bw'Abanyarwanda no guteza imbere ubukungu bushingiye ku ikoranabuhanga.",
    "about.teamTitle": "Menya Itsinda Ryacu",
    "about.teamDesc": "Abakozi bafite umuhate inyuma ya NiheMart",
    "about.team.ceo": "Umuyobozi Mukuru & Wasize Urubuga",
    "about.team.ceoDesc":
      "Umuyobozi ufite uburambe bw’imyaka 10+ mu bucuruzi no mu ikoranabuhanga.",
    "about.team.cto": "Umuyobozi w'Ikoranabuhanga",
    "about.team.ctoDesc":
      "Inzobere mu ikoranabuhanga, yitangiye kubaka ibisubizo birambye.",
    "about.team.ops": "Umuyobozi w'Ibikorwa",
    "about.team.opsDesc":
      "Inzobere mu micungire y'ibikorwa no kugeza ibicuruzwa ku gihe.",
    "about.stats.customers": "Abakiriya Banyuzwe",
    "about.stats.products": "Ibicuruzwa Biboneka",
    "about.stats.partners": "Abafatanyabikorwa",
    "about.stats.satisfaction": "Ijanisha ry'Abanyuzwe",
  },
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({
  children,
}) => {
  const [language, setLanguage] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem("nihemart-language");
    return savedLanguage === "rw" || savedLanguage === "en"
      ? savedLanguage
      : "en";
  });

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("nihemart-language", lang);
  };

  const t = (key: string): string => {
    // Try selected language, then fallback to English, then fallback to key
    return (
      translations[language][key as keyof (typeof translations)["en"]] ||
      translations["en"][key as keyof (typeof translations)["en"]] ||
      key
    );
  };

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage: handleSetLanguage, t }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
