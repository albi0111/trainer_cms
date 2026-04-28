import { ScrollView, StyleSheet } from 'react-native';

// This file is used to customize the HTML shell for the web app.
// It is only used in the web app.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* Link to manifest.json for PWA support */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Apple Home Screen Icon */}
        <link rel="apple-touch-icon" href="/icon.png" />
        
        {/* Meta tags for PWA appearance */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="FIT.PERSONA" />

        <style id="expo-reset">
          {`
            html, body {
              height: 100%;
              background-color: #0A0A0A;
            }
            #root {
              display: flex;
              height: 100%;
              flex: 1;
            }
          `}
        </style>
      </head>
      <body>{children}</body>
    </html>
  );
}
