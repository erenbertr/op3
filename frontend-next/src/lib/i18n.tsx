"use client"

import React, { createContext, useContext, useSyncExternalStore, ReactNode } from 'react';

type Locale = 'en' | 'tr' | 'es' | 'fr' | 'de';

interface Translations {
    [key: string]: {
        [locale in Locale]: string;
    };
}

const translations: Translations = {
    // Setup wizard
    'setup.title': {
        en: 'OP3 Setup Wizard',
        tr: 'OP3 Kurulum Sihirbazı',
        es: 'Asistente de Configuración OP3',
        fr: 'Assistant de Configuration OP3',
        de: 'OP3 Setup-Assistent'
    },
    'setup.subtitle': {
        en: 'Configure your application settings to get started',
        tr: 'Başlamak için uygulama ayarlarınızı yapılandırın',
        es: 'Configure los ajustes de su aplicación para comenzar',
        fr: 'Configurez les paramètres de votre application pour commencer',
        de: 'Konfigurieren Sie Ihre Anwendungseinstellungen, um zu beginnen'
    },
    'setup.step': {
        en: 'Step',
        tr: 'Adım',
        es: 'Paso',
        fr: 'Étape',
        de: 'Schritt'
    },
    'setup.complete': {
        en: 'complete',
        tr: 'tamamlandı',
        es: 'completo',
        fr: 'terminé',
        de: 'abgeschlossen'
    },
    'setup.database.title': {
        en: 'Database Configuration',
        tr: 'Veritabanı Yapılandırması',
        es: 'Configuración de Base de Datos',
        fr: 'Configuration de Base de Données',
        de: 'Datenbank-Konfiguration'
    },
    'setup.database.description': {
        en: 'Choose and configure your database connection',
        tr: 'Veritabanı bağlantınızı seçin ve yapılandırın',
        es: 'Elija y configure su conexión de base de datos',
        fr: 'Choisissez et configurez votre connexion de base de données',
        de: 'Wählen und konfigurieren Sie Ihre Datenbankverbindung'
    },
    'setup.database.type': {
        en: 'Database Type',
        tr: 'Veritabanı Türü',
        es: 'Tipo de Base de Datos',
        fr: 'Type de Base de Données',
        de: 'Datenbanktyp'
    },
    'setup.database.host': {
        en: 'Host',
        tr: 'Sunucu',
        es: 'Servidor',
        fr: 'Hôte',
        de: 'Host'
    },
    'setup.database.port': {
        en: 'Port',
        tr: 'Port',
        es: 'Puerto',
        fr: 'Port',
        de: 'Port'
    },
    'setup.database.name': {
        en: 'Database Name',
        tr: 'Veritabanı Adı',
        es: 'Nombre de Base de Datos',
        fr: 'Nom de Base de Données',
        de: 'Datenbankname'
    },
    'setup.database.username': {
        en: 'Username',
        tr: 'Kullanıcı Adı',
        es: 'Nombre de Usuario',
        fr: 'Nom d\'utilisateur',
        de: 'Benutzername'
    },
    'setup.database.password': {
        en: 'Password',
        tr: 'Şifre',
        es: 'Contraseña',
        fr: 'Mot de passe',
        de: 'Passwort'
    },
    'setup.database.connectionString': {
        en: 'Connection String',
        tr: 'Bağlantı Dizesi',
        es: 'Cadena de Conexión',
        fr: 'Chaîne de Connexion',
        de: 'Verbindungszeichenfolge'
    },
    'setup.database.ssl': {
        en: 'Use SSL',
        tr: 'SSL Kullan',
        es: 'Usar SSL',
        fr: 'Utiliser SSL',
        de: 'SSL verwenden'
    },
    'setup.database.filePath': {
        en: 'Database File Path',
        tr: 'Veritabanı Dosya Yolu',
        es: 'Ruta del Archivo de Base de Datos',
        fr: 'Chemin du Fichier de Base de Données',
        de: 'Datenbankdateipfad'
    },
    'setup.database.url': {
        en: 'Database URL',
        tr: 'Veritabanı URL\'si',
        es: 'URL de Base de Datos',
        fr: 'URL de Base de Données',
        de: 'Datenbank-URL'
    },
    'setup.database.apiKey': {
        en: 'API Key',
        tr: 'API Anahtarı',
        es: 'Clave API',
        fr: 'Clé API',
        de: 'API-Schlüssel'
    },
    'setup.database.projectId': {
        en: 'Project ID',
        tr: 'Proje Kimliği',
        es: 'ID del Proyecto',
        fr: 'ID du Projet',
        de: 'Projekt-ID'
    },
    'setup.database.authToken': {
        en: 'Auth Token',
        tr: 'Kimlik Doğrulama Jetonu',
        es: 'Token de Autenticación',
        fr: 'Jeton d\'Authentification',
        de: 'Authentifizierungs-Token'
    },
    'setup.database.region': {
        en: 'Region',
        tr: 'Bölge',
        es: 'Región',
        fr: 'Région',
        de: 'Region'
    },
    'button.testConnection': {
        en: 'Test Connection',
        tr: 'Bağlantıyı Test Et',
        es: 'Probar Conexión',
        fr: 'Tester la Connexion',
        de: 'Verbindung testen'
    },
    'button.next': {
        en: 'Next',
        tr: 'İleri',
        es: 'Siguiente',
        fr: 'Suivant',
        de: 'Weiter'
    },
    'button.back': {
        en: 'Back',
        tr: 'Geri',
        es: 'Atrás',
        fr: 'Retour',
        de: 'Zurück'
    },
    'status.testing': {
        en: 'Testing connection...',
        tr: 'Bağlantı test ediliyor...',
        es: 'Probando conexión...',
        fr: 'Test de connexion...',
        de: 'Verbindung wird getestet...'
    },
    'status.success': {
        en: 'Connection successful!',
        tr: 'Bağlantı başarılı!',
        es: '¡Conexión exitosa!',
        fr: 'Connexion réussie!',
        de: 'Verbindung erfolgreich!'
    },
    'status.error': {
        en: 'Connection failed',
        tr: 'Bağlantı başarısız',
        es: 'Conexión fallida',
        fr: 'Connexion échouée',
        de: 'Verbindung fehlgeschlagen'
    },
    'setup.complete.title': {
        en: 'Setup Complete',
        tr: 'Kurulum Tamamlandı',
        es: 'Configuración Completa',
        fr: 'Configuration Terminée',
        de: 'Setup Abgeschlossen'
    },
    'setup.complete.description': {
        en: 'Your application is ready to use',
        tr: 'Uygulamanız kullanıma hazır',
        es: 'Su aplicación está lista para usar',
        fr: 'Votre application est prête à être utilisée',
        de: 'Ihre Anwendung ist einsatzbereit'
    },
    'setup.complete.success.title': {
        en: 'Your OP3 application has been successfully configured!',
        tr: 'OP3 uygulamanız başarıyla yapılandırıldı!',
        es: '¡Su aplicación OP3 ha sido configurada exitosamente!',
        fr: 'Votre application OP3 a été configurée avec succès!',
        de: 'Ihre OP3-Anwendung wurde erfolgreich konfiguriert!'
    },
    'setup.complete.database.saved': {
        en: 'Database Configuration Saved',
        tr: 'Veritabanı Yapılandırması Kaydedildi',
        es: 'Configuración de Base de Datos Guardada',
        fr: 'Configuration de Base de Données Sauvegardée',
        de: 'Datenbank-Konfiguration Gespeichert'
    },
    'setup.complete.database.connected': {
        en: 'Connected to {type} database: {name}',
        tr: '{type} veritabanına bağlandı: {name}',
        es: 'Conectado a la base de datos {type}: {name}',
        fr: 'Connecté à la base de données {type}: {name}',
        de: 'Verbunden mit {type}-Datenbank: {name}'
    },

    // Admin setup
    'setup.admin.title': {
        en: 'Admin Account Setup',
        tr: 'Yönetici Hesabı Kurulumu',
        es: 'Configuración de Cuenta de Administrador',
        fr: 'Configuration du Compte Administrateur',
        de: 'Administrator-Konto-Einrichtung'
    },
    'setup.admin.description': {
        en: 'Create your administrator account to manage the application',
        tr: 'Uygulamayı yönetmek için yönetici hesabınızı oluşturun',
        es: 'Cree su cuenta de administrador para gestionar la aplicación',
        fr: 'Créez votre compte administrateur pour gérer l\'application',
        de: 'Erstellen Sie Ihr Administrator-Konto zur Verwaltung der Anwendung'
    },
    'setup.admin.email.label': {
        en: 'Email Address',
        tr: 'E-posta Adresi',
        es: 'Dirección de Correo Electrónico',
        fr: 'Adresse E-mail',
        de: 'E-Mail-Adresse'
    },
    'setup.admin.email.placeholder': {
        en: 'admin@example.com',
        tr: 'admin@ornek.com',
        es: 'admin@ejemplo.com',
        fr: 'admin@exemple.com',
        de: 'admin@beispiel.com'
    },
    'setup.admin.username.label': {
        en: 'Username (Optional)',
        tr: 'Kullanıcı Adı (İsteğe Bağlı)',
        es: 'Nombre de Usuario (Opcional)',
        fr: 'Nom d\'Utilisateur (Optionnel)',
        de: 'Benutzername (Optional)'
    },
    'setup.admin.username.placeholder': {
        en: 'admin',
        tr: 'admin',
        es: 'admin',
        fr: 'admin',
        de: 'admin'
    },
    'setup.admin.password.label': {
        en: 'Password',
        tr: 'Şifre',
        es: 'Contraseña',
        fr: 'Mot de Passe',
        de: 'Passwort'
    },
    'setup.admin.password.placeholder': {
        en: 'Enter a strong password',
        tr: 'Güçlü bir şifre girin',
        es: 'Ingrese una contraseña fuerte',
        fr: 'Entrez un mot de passe fort',
        de: 'Geben Sie ein starkes Passwort ein'
    },
    'setup.admin.confirmPassword.label': {
        en: 'Confirm Password',
        tr: 'Şifreyi Onayla',
        es: 'Confirmar Contraseña',
        fr: 'Confirmer le Mot de Passe',
        de: 'Passwort Bestätigen'
    },
    'setup.admin.confirmPassword.placeholder': {
        en: 'Re-enter your password',
        tr: 'Şifrenizi tekrar girin',
        es: 'Vuelva a ingresar su contraseña',
        fr: 'Ressaisissez votre mot de passe',
        de: 'Geben Sie Ihr Passwort erneut ein'
    },
    'setup.admin.requirements.title': {
        en: 'Password Requirements:',
        tr: 'Şifre Gereksinimleri:',
        es: 'Requisitos de Contraseña:',
        fr: 'Exigences du Mot de Passe:',
        de: 'Passwort-Anforderungen:'
    },
    'setup.admin.requirements.length': {
        en: 'At least 8 characters',
        tr: 'En az 8 karakter',
        es: 'Al menos 8 caracteres',
        fr: 'Au moins 8 caractères',
        de: 'Mindestens 8 Zeichen'
    },
    'setup.admin.requirements.uppercase': {
        en: 'One uppercase letter',
        tr: 'Bir büyük harf',
        es: 'Una letra mayúscula',
        fr: 'Une lettre majuscule',
        de: 'Ein Großbuchstabe'
    },
    'setup.admin.requirements.lowercase': {
        en: 'One lowercase letter',
        tr: 'Bir küçük harf',
        es: 'Una letra minúscula',
        fr: 'Une lettre minuscule',
        de: 'Ein Kleinbuchstabe'
    },
    'setup.admin.requirements.number': {
        en: 'One number',
        tr: 'Bir rakam',
        es: 'Un número',
        fr: 'Un chiffre',
        de: 'Eine Zahl'
    },
    'setup.admin.requirements.special': {
        en: 'One special character',
        tr: 'Bir özel karakter',
        es: 'Un carácter especial',
        fr: 'Un caractère spécial',
        de: 'Ein Sonderzeichen'
    },
    'setup.admin.button.create': {
        en: 'Create Admin Account',
        tr: 'Yönetici Hesabı Oluştur',
        es: 'Crear Cuenta de Administrador',
        fr: 'Créer un Compte Administrateur',
        de: 'Administrator-Konto Erstellen'
    },
    'setup.admin.success': {
        en: 'Admin account created successfully!',
        tr: 'Yönetici hesabı başarıyla oluşturuldu!',
        es: '¡Cuenta de administrador creada exitosamente!',
        fr: 'Compte administrateur créé avec succès!',
        de: 'Administrator-Konto erfolgreich erstellt!'
    },
    'setup.complete.final.message': {
        en: 'Your OP3 application is now fully configured and ready to use!',
        tr: 'OP3 uygulamanız artık tamamen yapılandırıldı ve kullanıma hazır!',
        es: '¡Su aplicación OP3 ahora está completamente configurada y lista para usar!',
        fr: 'Votre application OP3 est maintenant entièrement configurée et prête à être utilisée!',
        de: 'Ihre OP3-Anwendung ist jetzt vollständig konfiguriert und einsatzbereit!'
    },
    'setup.complete.login.button': {
        en: 'Login Now',
        tr: 'Şimdi Giriş Yap',
        es: 'Iniciar Sesión Ahora',
        fr: 'Se Connecter Maintenant',
        de: 'Jetzt Anmelden'
    },
    'setup.complete.login.description': {
        en: 'Click the button below to access your application and start using OP3.',
        tr: 'Uygulamanıza erişmek ve OP3\'ü kullanmaya başlamak için aşağıdaki düğmeye tıklayın.',
        es: 'Haga clic en el botón de abajo para acceder a su aplicación y comenzar a usar OP3.',
        fr: 'Cliquez sur le bouton ci-dessous pour accéder à votre application et commencer à utiliser OP3.',
        de: 'Klicken Sie auf die Schaltfläche unten, um auf Ihre Anwendung zuzugreifen und OP3 zu verwenden.'
    },

    // Login form
    'login.title': {
        en: 'Welcome to OP3',
        tr: 'OP3\'e Hoş Geldiniz',
        es: 'Bienvenido a OP3',
        fr: 'Bienvenue sur OP3',
        de: 'Willkommen bei OP3'
    },
    'login.description': {
        en: 'Sign in to your account to continue',
        tr: 'Devam etmek için hesabınıza giriş yapın',
        es: 'Inicie sesión en su cuenta para continuar',
        fr: 'Connectez-vous à votre compte pour continuer',
        de: 'Melden Sie sich bei Ihrem Konto an, um fortzufahren'
    },
    'login.email.label': {
        en: 'Email',
        tr: 'E-posta',
        es: 'Correo electrónico',
        fr: 'E-mail',
        de: 'E-Mail'
    },
    'login.email.placeholder': {
        en: 'Enter your email address',
        tr: 'E-posta adresinizi girin',
        es: 'Ingrese su dirección de correo electrónico',
        fr: 'Entrez votre adresse e-mail',
        de: 'Geben Sie Ihre E-Mail-Adresse ein'
    },
    'login.password.label': {
        en: 'Password',
        tr: 'Şifre',
        es: 'Contraseña',
        fr: 'Mot de passe',
        de: 'Passwort'
    },
    'login.password.placeholder': {
        en: 'Enter your password',
        tr: 'Şifrenizi girin',
        es: 'Ingrese su contraseña',
        fr: 'Entrez votre mot de passe',
        de: 'Geben Sie Ihr Passwort ein'
    },
    'login.button.submit': {
        en: 'Sign In',
        tr: 'Giriş Yap',
        es: 'Iniciar Sesión',
        fr: 'Se Connecter',
        de: 'Anmelden'
    },
    'login.button.loading': {
        en: 'Signing in...',
        tr: 'Giriş yapılıyor...',
        es: 'Iniciando sesión...',
        fr: 'Connexion en cours...',
        de: 'Anmeldung läuft...'
    },
    'badge.complete': {
        en: 'Complete',
        tr: 'Tamamlandı',
        es: 'Completo',
        fr: 'Terminé',
        de: 'Abgeschlossen'
    },
    'badge.current': {
        en: 'Current',
        tr: 'Mevcut',
        es: 'Actual',
        fr: 'Actuel',
        de: 'Aktuell'
    },
    'badge.upcoming': {
        en: 'Upcoming',
        tr: 'Yaklaşan',
        es: 'Próximo',
        fr: 'À venir',
        de: 'Bevorstehend'
    },
    'database.type.postgresql': {
        en: 'PostgreSQL',
        tr: 'PostgreSQL',
        es: 'PostgreSQL',
        fr: 'PostgreSQL',
        de: 'PostgreSQL'
    },
    'database.type.mysql': {
        en: 'MySQL',
        tr: 'MySQL',
        es: 'MySQL',
        fr: 'MySQL',
        de: 'MySQL'
    },
    'database.type.mongodb': {
        en: 'MongoDB',
        tr: 'MongoDB',
        es: 'MongoDB',
        fr: 'MongoDB',
        de: 'MongoDB'
    },
    'database.type.localdb': {
        en: 'LocalDB (SQLite)',
        tr: 'Yerel Veritabanı (SQLite)',
        es: 'Base de Datos Local (SQLite)',
        fr: 'Base de Données Locale (SQLite)',
        de: 'Lokale Datenbank (SQLite)'
    },
    'database.type.supabase': {
        en: 'Supabase',
        tr: 'Supabase',
        es: 'Supabase',
        fr: 'Supabase',
        de: 'Supabase'
    },
    'database.type.convex': {
        en: 'Convex',
        tr: 'Convex',
        es: 'Convex',
        fr: 'Convex',
        de: 'Convex'
    },
    'database.type.firebase': {
        en: 'Firebase Firestore',
        tr: 'Firebase Firestore',
        es: 'Firebase Firestore',
        fr: 'Firebase Firestore',
        de: 'Firebase Firestore'
    },
    'database.type.planetscale': {
        en: 'PlanetScale',
        tr: 'PlanetScale',
        es: 'PlanetScale',
        fr: 'PlanetScale',
        de: 'PlanetScale'
    },
    'database.type.neon': {
        en: 'Neon',
        tr: 'Neon',
        es: 'Neon',
        fr: 'Neon',
        de: 'Neon'
    },
    'database.type.turso': {
        en: 'Turso',
        tr: 'Turso',
        es: 'Turso',
        fr: 'Turso',
        de: 'Turso'
    },
    // Validation messages
    'validation.database.required': {
        en: 'Database name is required',
        tr: 'Veritabanı adı gereklidir',
        es: 'El nombre de la base de datos es requerido',
        fr: 'Le nom de la base de données est requis',
        de: 'Datenbankname ist erforderlich'
    },
    'validation.host.required': {
        en: 'Host is required',
        tr: 'Sunucu gereklidir',
        es: 'El host es requerido',
        fr: 'L\'hôte est requis',
        de: 'Host ist erforderlich'
    },
    'validation.port.required': {
        en: 'Port is required',
        tr: 'Port gereklidir',
        es: 'El puerto es requerido',
        fr: 'Le port est requis',
        de: 'Port ist erforderlich'
    },
    'validation.username.required': {
        en: 'Username is required',
        tr: 'Kullanıcı adı gereklidir',
        es: 'El nombre de usuario es requerido',
        fr: 'Le nom d\'utilisateur est requis',
        de: 'Benutzername ist erforderlich'
    },
    'validation.password.required': {
        en: 'Password is required',
        tr: 'Şifre gereklidir',
        es: 'La contraseña es requerida',
        fr: 'Le mot de passe est requis',
        de: 'Passwort ist erforderlich'
    },
    'validation.connectionString.required': {
        en: 'Connection string is required for MongoDB',
        tr: 'MongoDB için bağlantı dizesi gereklidir',
        es: 'La cadena de conexión es requerida para MongoDB',
        fr: 'La chaîne de connexion est requise pour MongoDB',
        de: 'Verbindungszeichenfolge ist für MongoDB erforderlich'
    },
    'validation.localdb.format': {
        en: 'LocalDB should be a .db or .sqlite file',
        tr: 'Yerel veritabanı .db veya .sqlite dosyası olmalıdır',
        es: 'LocalDB debe ser un archivo .db o .sqlite',
        fr: 'LocalDB doit être un fichier .db ou .sqlite',
        de: 'LocalDB sollte eine .db- oder .sqlite-Datei sein'
    },
    'validation.connection.failed': {
        en: 'Connection test failed',
        tr: 'Bağlantı testi başarısız',
        es: 'La prueba de conexión falló',
        fr: 'Le test de connexion a échoué',
        de: 'Verbindungstest fehlgeschlagen'
    },
    'validation.url.required': {
        en: 'URL is required',
        tr: 'URL gereklidir',
        es: 'La URL es requerida',
        fr: 'L\'URL est requise',
        de: 'URL ist erforderlich'
    },
    'validation.apiKey.required': {
        en: 'API Key is required',
        tr: 'API Anahtarı gereklidir',
        es: 'La Clave API es requerida',
        fr: 'La Clé API est requise',
        de: 'API-Schlüssel ist erforderlich'
    },
    'validation.projectId.required': {
        en: 'Project ID is required',
        tr: 'Proje Kimliği gereklidir',
        es: 'El ID del Proyecto es requerido',
        fr: 'L\'ID du Projet est requis',
        de: 'Projekt-ID ist erforderlich'
    },
    'validation.authToken.required': {
        en: 'Auth Token is required',
        tr: 'Kimlik Doğrulama Jetonu gereklidir',
        es: 'El Token de Autenticación es requerido',
        fr: 'Le Jeton d\'Authentification est requis',
        de: 'Authentifizierungs-Token ist erforderlich'
    },

    // Admin validation messages
    'validation.admin.email.required': {
        en: 'Email is required',
        tr: 'E-posta gereklidir',
        es: 'El correo electrónico es requerido',
        fr: 'L\'e-mail est requis',
        de: 'E-Mail ist erforderlich'
    },
    'validation.admin.email.invalid': {
        en: 'Please enter a valid email address',
        tr: 'Lütfen geçerli bir e-posta adresi girin',
        es: 'Por favor ingrese una dirección de correo válida',
        fr: 'Veuillez entrer une adresse e-mail valide',
        de: 'Bitte geben Sie eine gültige E-Mail-Adresse ein'
    },
    'validation.admin.password.minLength': {
        en: 'Password must be at least 8 characters long',
        tr: 'Şifre en az 8 karakter uzunluğunda olmalıdır',
        es: 'La contraseña debe tener al menos 8 caracteres',
        fr: 'Le mot de passe doit contenir au moins 8 caractères',
        de: 'Das Passwort muss mindestens 8 Zeichen lang sein'
    },
    'validation.admin.password.uppercase': {
        en: 'Password must contain at least one uppercase letter',
        tr: 'Şifre en az bir büyük harf içermelidir',
        es: 'La contraseña debe contener al menos una letra mayúscula',
        fr: 'Le mot de passe doit contenir au moins une lettre majuscule',
        de: 'Das Passwort muss mindestens einen Großbuchstaben enthalten'
    },
    'validation.admin.password.lowercase': {
        en: 'Password must contain at least one lowercase letter',
        tr: 'Şifre en az bir küçük harf içermelidir',
        es: 'La contraseña debe contener al menos una letra minúscula',
        fr: 'Le mot de passe doit contenir au moins une lettre minuscule',
        de: 'Das Passwort muss mindestens einen Kleinbuchstaben enthalten'
    },
    'validation.admin.password.number': {
        en: 'Password must contain at least one number',
        tr: 'Şifre en az bir rakam içermelidir',
        es: 'La contraseña debe contener al menos un número',
        fr: 'Le mot de passe doit contenir au moins un chiffre',
        de: 'Das Passwort muss mindestens eine Zahl enthalten'
    },
    'validation.admin.password.special': {
        en: 'Password must contain at least one special character',
        tr: 'Şifre en az bir özel karakter içermelidir',
        es: 'La contraseña debe contener al menos un carácter especial',
        fr: 'Le mot de passe doit contenir au moins un caractère spécial',
        de: 'Das Passwort muss mindestens ein Sonderzeichen enthalten'
    },
    'validation.admin.confirmPassword.mismatch': {
        en: 'Passwords do not match',
        tr: 'Şifreler eşleşmiyor',
        es: 'Las contraseñas no coinciden',
        fr: 'Les mots de passe ne correspondent pas',
        de: 'Passwörter stimmen nicht überein'
    },
    'validation.admin.username.minLength': {
        en: 'Username must be at least 3 characters long',
        tr: 'Kullanıcı adı en az 3 karakter uzunluğunda olmalıdır',
        es: 'El nombre de usuario debe tener al menos 3 caracteres',
        fr: 'Le nom d\'utilisateur doit contenir au moins 3 caractères',
        de: 'Der Benutzername muss mindestens 3 Zeichen lang sein'
    },

    // AI Provider setup
    'setup.aiProvider.title': {
        en: 'AI Provider Configuration',
        tr: 'AI Sağlayıcı Yapılandırması',
        es: 'Configuración de Proveedor de IA',
        fr: 'Configuration du Fournisseur IA',
        de: 'KI-Anbieter-Konfiguration'
    },
    'setup.aiProvider.description': {
        en: 'Configure AI API providers to enable intelligent features',
        tr: 'Akıllı özellikleri etkinleştirmek için AI API sağlayıcılarını yapılandırın',
        es: 'Configure proveedores de API de IA para habilitar funciones inteligentes',
        fr: 'Configurez les fournisseurs d\'API IA pour activer les fonctionnalités intelligentes',
        de: 'Konfigurieren Sie KI-API-Anbieter, um intelligente Funktionen zu aktivieren'
    },
    'setup.aiProvider.addProvider': {
        en: 'Add AI Provider',
        tr: 'AI Sağlayıcı Ekle',
        es: 'Agregar Proveedor de IA',
        fr: 'Ajouter un Fournisseur IA',
        de: 'KI-Anbieter Hinzufügen'
    },
    'setup.aiProvider.removeProvider': {
        en: 'Remove Provider',
        tr: 'Sağlayıcıyı Kaldır',
        es: 'Eliminar Proveedor',
        fr: 'Supprimer le Fournisseur',
        de: 'Anbieter Entfernen'
    },
    'setup.aiProvider.type.label': {
        en: 'Provider Type',
        tr: 'Sağlayıcı Türü',
        es: 'Tipo de Proveedor',
        fr: 'Type de Fournisseur',
        de: 'Anbieter-Typ'
    },
    'setup.aiProvider.type.placeholder': {
        en: 'Select AI provider',
        tr: 'AI sağlayıcı seçin',
        es: 'Seleccionar proveedor de IA',
        fr: 'Sélectionner le fournisseur IA',
        de: 'KI-Anbieter auswählen'
    },
    'setup.aiProvider.name.label': {
        en: 'Custom Name',
        tr: 'Özel Ad',
        es: 'Nombre Personalizado',
        fr: 'Nom Personnalisé',
        de: 'Benutzerdefinierter Name'
    },
    'setup.aiProvider.name.placeholder': {
        en: 'e.g., OpenAI - Personal, Claude - Work',
        tr: 'örn., OpenAI - Kişisel, Claude - İş',
        es: 'ej., OpenAI - Personal, Claude - Trabajo',
        fr: 'ex., OpenAI - Personnel, Claude - Travail',
        de: 'z.B., OpenAI - Persönlich, Claude - Arbeit'
    },
    'setup.aiProvider.apiKey.label': {
        en: 'API Key',
        tr: 'API Anahtarı',
        es: 'Clave API',
        fr: 'Clé API',
        de: 'API-Schlüssel'
    },
    'setup.aiProvider.apiKey.placeholder': {
        en: 'Enter your API key',
        tr: 'API anahtarınızı girin',
        es: 'Ingrese su clave API',
        fr: 'Entrez votre clé API',
        de: 'Geben Sie Ihren API-Schlüssel ein'
    },
    'setup.aiProvider.model.label': {
        en: 'Model',
        tr: 'Model',
        es: 'Modelo',
        fr: 'Modèle',
        de: 'Modell'
    },
    'setup.aiProvider.model.placeholder': {
        en: 'Select or enter model name',
        tr: 'Model adını seçin veya girin',
        es: 'Seleccione o ingrese el nombre del modelo',
        fr: 'Sélectionnez ou entrez le nom du modèle',
        de: 'Wählen Sie einen Modellnamen aus oder geben Sie ihn ein'
    },
    'setup.aiProvider.endpoint.label': {
        en: 'Custom Endpoint (Optional)',
        tr: 'Özel Uç Nokta (İsteğe Bağlı)',
        es: 'Endpoint Personalizado (Opcional)',
        fr: 'Point de Terminaison Personnalisé (Optionnel)',
        de: 'Benutzerdefinierter Endpunkt (Optional)'
    },
    'setup.aiProvider.endpoint.placeholder': {
        en: 'https://api.example.com/v1',
        tr: 'https://api.example.com/v1',
        es: 'https://api.example.com/v1',
        fr: 'https://api.example.com/v1',
        de: 'https://api.example.com/v1'
    },
    'setup.aiProvider.testConnection': {
        en: 'Test Connection',
        tr: 'Bağlantıyı Test Et',
        es: 'Probar Conexión',
        fr: 'Tester la Connexion',
        de: 'Verbindung Testen'
    },
    'setup.aiProvider.testing': {
        en: 'Testing...',
        tr: 'Test ediliyor...',
        es: 'Probando...',
        fr: 'Test en cours...',
        de: 'Teste...'
    },
    'setup.aiProvider.connectionSuccess': {
        en: 'Connection successful',
        tr: 'Bağlantı başarılı',
        es: 'Conexión exitosa',
        fr: 'Connexion réussie',
        de: 'Verbindung erfolgreich'
    },
    'setup.aiProvider.connectionFailed': {
        en: 'Connection failed',
        tr: 'Bağlantı başarısız',
        es: 'Conexión fallida',
        fr: 'Connexion échouée',
        de: 'Verbindung fehlgeschlagen'
    },
    'setup.aiProvider.button.continue': {
        en: 'Continue to Final Step',
        tr: 'Son Adıma Devam Et',
        es: 'Continuar al Paso Final',
        fr: 'Continuer à l\'Étape Finale',
        de: 'Zum Letzten Schritt Fortfahren'
    },
    'setup.aiProvider.requireAtLeastOne': {
        en: 'At least one AI provider must be configured',
        tr: 'En az bir AI sağlayıcı yapılandırılmalıdır',
        es: 'Al menos un proveedor de IA debe estar configurado',
        fr: 'Au moins un fournisseur IA doit être configuré',
        de: 'Mindestens ein KI-Anbieter muss konfiguriert werden'
    },

    // AI Provider types
    'aiProvider.type.openai': {
        en: 'OpenAI',
        tr: 'OpenAI',
        es: 'OpenAI',
        fr: 'OpenAI',
        de: 'OpenAI'
    },
    'aiProvider.type.anthropic': {
        en: 'Anthropic (Claude)',
        tr: 'Anthropic (Claude)',
        es: 'Anthropic (Claude)',
        fr: 'Anthropic (Claude)',
        de: 'Anthropic (Claude)'
    },
    'aiProvider.type.google': {
        en: 'Google (Gemini)',
        tr: 'Google (Gemini)',
        es: 'Google (Gemini)',
        fr: 'Google (Gemini)',
        de: 'Google (Gemini)'
    },
    'aiProvider.type.replicate': {
        en: 'Replicate',
        tr: 'Replicate',
        es: 'Replicate',
        fr: 'Replicate',
        de: 'Replicate'
    },
    'aiProvider.type.openrouter': {
        en: 'OpenRouter',
        tr: 'OpenRouter',
        es: 'OpenRouter',
        fr: 'OpenRouter',
        de: 'OpenRouter'
    },
    'aiProvider.type.custom': {
        en: 'Custom Provider',
        tr: 'Özel Sağlayıcı',
        es: 'Proveedor Personalizado',
        fr: 'Fournisseur Personnalisé',
        de: 'Benutzerdefinierter Anbieter'
    },

    // AI Provider validation messages
    'validation.aiProvider.type.required': {
        en: 'Provider type is required',
        tr: 'Sağlayıcı türü gereklidir',
        es: 'El tipo de proveedor es requerido',
        fr: 'Le type de fournisseur est requis',
        de: 'Anbieter-Typ ist erforderlich'
    },
    'validation.aiProvider.name.required': {
        en: 'Custom name is required',
        tr: 'Özel ad gereklidir',
        es: 'El nombre personalizado es requerido',
        fr: 'Le nom personnalisé est requis',
        de: 'Benutzerdefinierter Name ist erforderlich'
    },
    'validation.aiProvider.name.minLength': {
        en: 'Name must be at least 2 characters long',
        tr: 'Ad en az 2 karakter uzunluğunda olmalıdır',
        es: 'El nombre debe tener al menos 2 caracteres',
        fr: 'Le nom doit contenir au moins 2 caractères',
        de: 'Der Name muss mindestens 2 Zeichen lang sein'
    },
    'validation.aiProvider.apiKey.required': {
        en: 'API key is required',
        tr: 'API anahtarı gereklidir',
        es: 'La clave API es requerida',
        fr: 'La clé API est requise',
        de: 'API-Schlüssel ist erforderlich'
    },
    'validation.aiProvider.apiKey.minLength': {
        en: 'API key must be at least 10 characters long',
        tr: 'API anahtarı en az 10 karakter uzunluğunda olmalıdır',
        es: 'La clave API debe tener al menos 10 caracteres',
        fr: 'La clé API doit contenir au moins 10 caractères',
        de: 'API-Schlüssel muss mindestens 10 Zeichen lang sein'
    },
    'validation.aiProvider.model.required': {
        en: 'Model is required',
        tr: 'Model gereklidir',
        es: 'El modelo es requerido',
        fr: 'Le modèle est requis',
        de: 'Modell ist erforderlich'
    },
    'validation.aiProvider.endpoint.invalid': {
        en: 'Please enter a valid URL',
        tr: 'Lütfen geçerli bir URL girin',
        es: 'Por favor ingrese una URL válida',
        fr: 'Veuillez entrer une URL valide',
        de: 'Bitte geben Sie eine gültige URL ein'
    }
};

interface I18nContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// External store for localStorage locale management
function subscribeToLocaleStorage(callback: () => void) {
    const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'locale') {
            callback();
        }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
        window.removeEventListener('storage', handleStorageChange);
    };
}

function getLocaleSnapshot(): Locale {
    if (typeof window === 'undefined') return 'en';
    try {
        const savedLocale = localStorage.getItem('locale') as Locale;
        return (savedLocale && ['en', 'tr', 'es', 'fr', 'de'].includes(savedLocale)) ? savedLocale : 'en';
    } catch (error) {
        console.warn('Failed to access localStorage for locale:', error);
        return 'en';
    }
}

function getServerLocaleSnapshot(): Locale {
    return 'en'; // Default for SSR
}

export function I18nProvider({ children }: { children: ReactNode }) {
    // Use useSyncExternalStore for localStorage synchronization
    const locale = useSyncExternalStore(
        subscribeToLocaleStorage,
        getLocaleSnapshot,
        getServerLocaleSnapshot
    );

    const setLocale = (newLocale: Locale) => {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem('locale', newLocale);
            // Trigger storage event for cross-tab synchronization
            window.dispatchEvent(new StorageEvent('storage', {
                key: 'locale',
                newValue: newLocale,
                oldValue: localStorage.getItem('locale')
            }));
        } catch (error) {
            console.warn('Failed to save locale to localStorage:', error);
        }
    };

    const t = (key: string): string => {
        return translations[key]?.[locale] || key;
    };

    return (
        <I18nContext.Provider value={{ locale, setLocale, t }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useI18n() {
    const context = useContext(I18nContext);
    if (context === undefined) {
        throw new Error('useI18n must be used within an I18nProvider');
    }
    return context;
}
