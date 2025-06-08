"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
    'setup.complete.final.message': {
        en: 'You can now start using your application. Additional configuration steps will be available in future updates.',
        tr: 'Artık uygulamanızı kullanmaya başlayabilirsiniz. Gelecek güncellemelerde ek yapılandırma adımları mevcut olacaktır.',
        es: 'Ahora puede comenzar a usar su aplicación. Pasos de configuración adicionales estarán disponibles en futuras actualizaciones.',
        fr: 'Vous pouvez maintenant commencer à utiliser votre application. Des étapes de configuration supplémentaires seront disponibles dans les futures mises à jour.',
        de: 'Sie können jetzt mit der Nutzung Ihrer Anwendung beginnen. Zusätzliche Konfigurationsschritte werden in zukünftigen Updates verfügbar sein.'
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
    }
};

interface I18nContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>('en');

    useEffect(() => {
        // Load locale from localStorage
        const savedLocale = localStorage.getItem('locale') as Locale;
        if (savedLocale && ['en', 'tr', 'es', 'fr', 'de'].includes(savedLocale)) {
            setLocaleState(savedLocale);
        }
    }, []);

    const setLocale = (newLocale: Locale) => {
        setLocaleState(newLocale);
        localStorage.setItem('locale', newLocale);
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
