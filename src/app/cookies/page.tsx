export default function CookiePolicyPage() {
  return (
    <>
      <style>{`

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: var(--font-body-new);
        }
      `}</style>

      {/* NAVBAR */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '68px',
          background: 'rgba(5,8,12,0.9)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 48px',
        }}
      >
        {/* Logo */}
        <a
          href="/"
          style={{
            fontFamily: "var(--font-support-new)",
            fontSize: '24px',
            fontWeight: 600,
            color: '#10C4C3',
            textDecoration: 'none',
            letterSpacing: '2px',
          }}
        >
          Nilay 360 ·
        </a>

        {/* Nav Links */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '32px',
          }}
        >
          {[
            { label: 'Home', href: '/' },
            { label: 'Properties', href: '/properties' },
            { label: 'New Projects', href: '/new-projects' },
            { label: 'Agents', href: '/agents' },
            { label: 'Locations', href: '/locations' },
            { label: 'Contact', href: '/contact' },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              style={{
                fontFamily: "var(--font-body-new)",
                fontSize: '14px',
                fontWeight: 400,
                color: 'rgba(255,255,255,0.8)',
                textDecoration: 'none',
                letterSpacing: '0.3px',
              }}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <a
            href="/login"
            style={{
              fontFamily: "var(--font-body-new)",
              fontSize: '14px',
              fontWeight: 500,
              color: '#10C4C3',
              border: '1px solid #10C4C3',
              padding: '8px 20px',
              textDecoration: 'none',
              borderRadius: '2px',
              background: 'transparent',
            }}
          >
            Sign In
          </a>
          <a
            href="/post-property"
            style={{
              fontFamily: "var(--font-body-new)",
              fontSize: '14px',
              fontWeight: 500,
              color: '#05080C',
              background: '#10C4C3',
              padding: '8px 20px',
              textDecoration: 'none',
              borderRadius: '2px',
            }}
          >
            List Property
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section
        style={{
          background: '#020C1C',
          paddingTop: '140px',
          paddingBottom: '72px',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-support-new)",
            fontSize: '12px',
            fontWeight: 500,
            color: '#10C4C3',
            letterSpacing: '4px',
            textTransform: 'uppercase',
            marginBottom: '20px',
          }}
        >
          LEGAL
        </p>
        <h1
          style={{
            fontFamily: "var(--font-heading-new)",
            fontSize: '64px',
            fontWeight: 600,
            color: '#ffffff',
            lineHeight: 1.1,
            marginBottom: '20px',
          }}
        >
          Cookie Policy
        </h1>
        <p
          style={{
            fontFamily: "var(--font-body-new)",
            fontSize: '15px',
            fontWeight: 400,
            color: 'rgba(255,255,255,0.6)',
            letterSpacing: '0.3px',
          }}
        >
          How we use cookies and similar technologies
        </p>
      </section>

      {/* CONTENT */}
      <section
        style={{
          background: '#020C1C',
          padding: '72px 24px',
        }}
      >
        <div
          style={{
            background: '#ffffff',
            maxWidth: '820px',
            margin: '0 auto',
            padding: '56px',
            borderRadius: '2px',
            boxShadow: '0 2px 24px rgba(0,0,0,0.06)',
          }}
        >
          {/* Section 1 — What Are Cookies */}
          <div>
            <h2
              style={{
                fontFamily: "var(--font-heading-new)",
                fontSize: '36px',
                fontWeight: 600,
                color: '#020C1C',
                borderBottom: '2px solid #10C4C3',
                paddingBottom: '12px',
                marginBottom: '20px',
              }}
            >
              1. What Are Cookies
            </h2>
            <p
              style={{
                fontFamily: "var(--font-body-new)",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
              }}
            >
              Cookies are small text files that are placed on your device (computer, smartphone, or tablet) when you
              visit a website. They are widely used to make websites work more efficiently, improve user experience, and
              provide information to website owners. Cookies are not programs and cannot carry viruses. We also use
              similar technologies such as web beacons, pixel tags, local storage, and session storage, which this
              policy refers to collectively as &ldquo;cookies.&rdquo;
            </p>
          </div>

          {/* Section 2 — Types of Cookies We Use */}
          <div style={{ marginTop: '48px' }}>
            <h2
              style={{
                fontFamily: "var(--font-heading-new)",
                fontSize: '36px',
                fontWeight: 600,
                color: '#020C1C',
                borderBottom: '2px solid #10C4C3',
                paddingBottom: '12px',
                marginBottom: '20px',
              }}
            >
              2. Types of Cookies We Use
            </h2>
            <p
              style={{
                fontFamily: "var(--font-body-new)",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
              }}
            >
              We use four categories of cookies on the Platform. The table below summarises each type, its purpose,
              examples of specific cookies in use, and your opt-out options where applicable.
            </p>
            <div style={{ overflowX: 'auto', marginTop: '24px' }}>
              <table
                style={{
                  borderCollapse: 'collapse',
                  width: '100%',
                }}
              >
                <thead>
                  <tr>
                    {['Cookie Type', 'Purpose', 'Examples', 'Opt-Out'].map((heading) => (
                      <th
                        key={heading}
                        style={{
                          background: '#020C1C',
                          color: '#ffffff',
                          padding: '14px 16px',
                          border: '1px solid #E8E3D9',
                          fontFamily: "var(--font-body-new)",
                          fontSize: '14px',
                          fontWeight: 500,
                          textAlign: 'left',
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td
                      style={{
                        padding: '14px 16px',
                        border: '1px solid #E8E3D9',
                        fontFamily: "var(--font-body-new)",
                        fontSize: '14px',
                        color: '#333333',
                        background: '#ffffff',
                        verticalAlign: 'top',
                      }}
                    >
                      Essential Cookies
                    </td>
                    <td
                      style={{
                        padding: '14px 16px',
                        border: '1px solid #E8E3D9',
                        fontFamily: "var(--font-body-new)",
                        fontSize: '14px',
                        color: '#333333',
                        background: '#ffffff',
                        verticalAlign: 'top',
                      }}
                    >
                      Required for the Platform to function correctly — session management, authentication, security
                      tokens, load balancing. Cannot be disabled without breaking core functionality.
                    </td>
                    <td
                      style={{
                        padding: '14px 16px',
                        border: '1px solid #E8E3D9',
                        fontFamily: "var(--font-body-new)",
                        fontSize: '14px',
                        color: '#333333',
                        background: '#ffffff',
                        verticalAlign: 'top',
                      }}
                    >
                      JSESSIONID, _csrf_token, auth_session
                    </td>
                    <td
                      style={{
                        padding: '14px 16px',
                        border: '1px solid #E8E3D9',
                        fontFamily: "var(--font-body-new)",
                        fontSize: '14px',
                        color: '#333333',
                        background: '#ffffff',
                        verticalAlign: 'top',
                      }}
                    >
                      Not applicable — essential for service
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        padding: '14px 16px',
                        border: '1px solid #E8E3D9',
                        fontFamily: "var(--font-body-new)",
                        fontSize: '14px',
                        color: '#333333',
                        background: '#020C1C',
                        verticalAlign: 'top',
                      }}
                    >
                      Analytics Cookies
                    </td>
                    <td
                      style={{
                        padding: '14px 16px',
                        border: '1px solid #E8E3D9',
                        fontFamily: "var(--font-body-new)",
                        fontSize: '14px',
                        color: '#333333',
                        background: '#020C1C',
                        verticalAlign: 'top',
                      }}
                    >
                      Help us understand how visitors interact with the Platform — pages visited, time spent, bounce
                      rate, error messages. Used to improve performance and user experience.
                    </td>
                    <td
                      style={{
                        padding: '14px 16px',
                        border: '1px solid #E8E3D9',
                        fontFamily: "var(--font-body-new)",
                        fontSize: '14px',
                        color: '#333333',
                        background: '#020C1C',
                        verticalAlign: 'top',
                      }}
                    >
                      Google Analytics (_ga, _gid), Hotjar (_hjid, _hjSession)
                    </td>
                    <td
                      style={{
                        padding: '14px 16px',
                        border: '1px solid #E8E3D9',
                        fontFamily: "var(--font-body-new)",
                        fontSize: '14px',
                        color: '#333333',
                        background: '#020C1C',
                        verticalAlign: 'top',
                      }}
                    >
                      Yes — opt out via cookie settings or Google Analytics Opt-out Add-on (tools.google.com/dlpage/gaoptout)
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        padding: '14px 16px',
                        border: '1px solid #E8E3D9',
                        fontFamily: "var(--font-body-new)",
                        fontSize: '14px',
                        color: '#333333',
                        background: '#ffffff',
                        verticalAlign: 'top',
                      }}
                    >
                      Preference Cookies
                    </td>
                    <td
                      style={{
                        padding: '14px 16px',
                        border: '1px solid #E8E3D9',
                        fontFamily: "var(--font-body-new)",
                        fontSize: '14px',
                        color: '#333333',
                        background: '#ffffff',
                        verticalAlign: 'top',
                      }}
                    >
                      Remember your choices and personalise your experience — saved search filters, recently viewed
                      properties, preferred city, language preference, map view settings.
                    </td>
                    <td
                      style={{
                        padding: '14px 16px',
                        border: '1px solid #E8E3D9',
                        fontFamily: "var(--font-body-new)",
                        fontSize: '14px',
                        color: '#333333',
                        background: '#ffffff',
                        verticalAlign: 'top',
                      }}
                    >
                      pref_city, saved_filters, view_mode
                    </td>
                    <td
                      style={{
                        padding: '14px 16px',
                        border: '1px solid #E8E3D9',
                        fontFamily: "var(--font-body-new)",
                        fontSize: '14px',
                        color: '#333333',
                        background: '#ffffff',
                        verticalAlign: 'top',
                      }}
                    >
                      Yes — clear browser cookies or adjust cookie preferences
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        padding: '14px 16px',
                        border: '1px solid #E8E3D9',
                        fontFamily: "var(--font-body-new)",
                        fontSize: '14px',
                        color: '#333333',
                        background: '#020C1C',
                        verticalAlign: 'top',
                      }}
                    >
                      Marketing Cookies
                    </td>
                    <td
                      style={{
                        padding: '14px 16px',
                        border: '1px solid #E8E3D9',
                        fontFamily: "var(--font-body-new)",
                        fontSize: '14px',
                        color: '#333333',
                        background: '#020C1C',
                        verticalAlign: 'top',
                      }}
                    >
                      Used to deliver relevant advertisements on third-party platforms, measure campaign effectiveness,
                      and build interest-based audience profiles.
                    </td>
                    <td
                      style={{
                        padding: '14px 16px',
                        border: '1px solid #E8E3D9',
                        fontFamily: "var(--font-body-new)",
                        fontSize: '14px',
                        color: '#333333',
                        background: '#020C1C',
                        verticalAlign: 'top',
                      }}
                    >
                      Google Ads (_gcl_au), Meta Pixel (_fbp), Criteo (cto_bundle)
                    </td>
                    <td
                      style={{
                        padding: '14px 16px',
                        border: '1px solid #E8E3D9',
                        fontFamily: "var(--font-body-new)",
                        fontSize: '14px',
                        color: '#333333',
                        background: '#020C1C',
                        verticalAlign: 'top',
                      }}
                    >
                      Yes — opt out via NAI opt-out tool (optout.networkadvertising.org) or Google Ad Settings
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p
              style={{
                fontFamily: "var(--font-body-new)",
                fontSize: '14px',
                fontWeight: 400,
                color: '#666666',
                lineHeight: 1.8,
                marginTop: '16px',
                fontStyle: 'italic',
              }}
            >
              Last updated cookie inventory: June 2025. Cookie lifetimes range from session-only (deleted when you
              close your browser) to up to 24 months for persistent cookies.
            </p>
          </div>

          {/* Section 3 — How to Manage Cookies */}
          <div style={{ marginTop: '48px' }}>
            <h2
              style={{
                fontFamily: "var(--font-heading-new)",
                fontSize: '36px',
                fontWeight: 600,
                color: '#020C1C',
                borderBottom: '2px solid #10C4C3',
                paddingBottom: '12px',
                marginBottom: '20px',
              }}
            >
              3. How to Manage Cookies
            </h2>
            <p
              style={{
                fontFamily: "var(--font-body-new)",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
                marginBottom: '16px',
              }}
            >
              You can control and manage cookies through your browser settings. Note that disabling certain cookies may
              affect the functionality of the Platform. Here is how to manage cookies in major browsers:
            </p>
            <ul
              style={{
                fontFamily: "var(--font-body-new)",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
                paddingLeft: '24px',
              }}
            >
              <li style={{ marginBottom: '12px' }}>
                <strong>Google Chrome:</strong> Click the three-dot menu &rarr; Settings &rarr; Privacy and security
                &rarr; Cookies and other site data. You can block third-party cookies, clear all cookies, or add
                exceptions for specific sites.
              </li>
              <li style={{ marginBottom: '12px' }}>
                <strong>Mozilla Firefox:</strong> Click the hamburger menu &rarr; Settings &rarr; Privacy &amp;
                Security &rarr; Enhanced Tracking Protection. Choose Standard, Strict, or Custom protection levels.
              </li>
              <li style={{ marginBottom: '12px' }}>
                <strong>Safari (macOS/iOS):</strong> Go to Safari &rarr; Preferences (macOS) or Settings &rarr; Safari
                (iOS) &rarr; Privacy &rarr; Block All Cookies. Note that blocking all cookies will prevent some
                features from working.
              </li>
              <li style={{ marginBottom: '12px' }}>
                <strong>Microsoft Edge:</strong> Click the three-dot menu &rarr; Settings &rarr; Cookies and site
                permissions &rarr; Manage and delete cookies and site data.
              </li>
            </ul>
            <p
              style={{
                fontFamily: "var(--font-body-new)",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
                marginTop: '16px',
              }}
            >
              You may also use the Nilay 360 Cookie Preference Centre (accessible via the cookie banner on first visit) to
              granularly accept or reject non-essential cookies.
            </p>
          </div>

          {/* Section 4 — Third-Party Cookies */}
          <div style={{ marginTop: '48px' }}>
            <h2
              style={{
                fontFamily: "var(--font-heading-new)",
                fontSize: '36px',
                fontWeight: 600,
                color: '#020C1C',
                borderBottom: '2px solid #10C4C3',
                paddingBottom: '12px',
                marginBottom: '20px',
              }}
            >
              4. Third-Party Cookies
            </h2>
            <p
              style={{
                fontFamily: "var(--font-body-new)",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
                marginBottom: '16px',
              }}
            >
              Some cookies on the Platform are set by third-party services that appear on our pages. We do not control
              these third-party cookies. The main third parties whose cookies may be present are:
            </p>
            <ul
              style={{
                fontFamily: "var(--font-body-new)",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
                paddingLeft: '24px',
              }}
            >
              <li style={{ marginBottom: '12px' }}>
                <strong>Google LLC:</strong> for analytics (Google Analytics) and advertising (Google Ads) &mdash;
                Google&rsquo;s Privacy Policy is available at{' '}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#10C4C3', textDecoration: 'none' }}
                >
                  policies.google.com/privacy
                </a>
                .
              </li>
              <li style={{ marginBottom: '12px' }}>
                <strong>Meta Platforms, Inc.:</strong> for retargeting through the Meta Pixel &mdash; Meta&rsquo;s
                Data Policy is available at{' '}
                <a
                  href="https://www.facebook.com/policy.php"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#10C4C3', textDecoration: 'none' }}
                >
                  www.facebook.com/policy.php
                </a>
                .
              </li>
              <li style={{ marginBottom: '12px' }}>
                <strong>Hotjar Ltd.:</strong> for behaviour analytics and session recordings &mdash; Hotjar&rsquo;s
                Privacy Policy is available at{' '}
                <a
                  href="https://www.hotjar.com/legal/policies/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#10C4C3', textDecoration: 'none' }}
                >
                  www.hotjar.com/legal/policies/privacy
                </a>{' '}
                &mdash; you can opt out at{' '}
                <a
                  href="https://www.hotjar.com/legal/compliance/opt-out"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#10C4C3', textDecoration: 'none' }}
                >
                  www.hotjar.com/legal/compliance/opt-out
                </a>
                .
              </li>
              <li style={{ marginBottom: '12px' }}>
                <strong>Cloudflare, Inc.:</strong> for performance and security (does not track users across sites).
              </li>
            </ul>
            <p
              style={{
                fontFamily: "var(--font-body-new)",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
                marginTop: '16px',
              }}
            >
              These third parties have their own privacy policies and Nilay 360 is not responsible for their data
              practices.
            </p>
          </div>

          {/* Section 5 — Updates to This Policy */}
          <div style={{ marginTop: '48px' }}>
            <h2
              style={{
                fontFamily: "var(--font-heading-new)",
                fontSize: '36px',
                fontWeight: 600,
                color: '#020C1C',
                borderBottom: '2px solid #10C4C3',
                paddingBottom: '12px',
                marginBottom: '20px',
              }}
            >
              5. Updates to This Policy
            </h2>
            <p
              style={{
                fontFamily: "var(--font-body-new)",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
              }}
            >
              We may update this Cookie Policy from time to time to reflect changes in our practices or for legal,
              regulatory, or operational reasons. When we make significant changes, we will notify you via the cookie
              banner on the Platform and update the &ldquo;Last updated&rdquo; date at the top of this page. We
              encourage you to review this policy periodically.
            </p>
          </div>

          {/* Section 6 — Contact */}
          <div style={{ marginTop: '48px' }}>
            <h2
              style={{
                fontFamily: "var(--font-heading-new)",
                fontSize: '36px',
                fontWeight: 600,
                color: '#020C1C',
                borderBottom: '2px solid #10C4C3',
                paddingBottom: '12px',
                marginBottom: '20px',
              }}
            >
              6. Contact
            </h2>
            <p
              style={{
                fontFamily: "var(--font-body-new)",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
                marginBottom: '20px',
              }}
            >
              If you have questions about our use of cookies or this Cookie Policy, please contact us at:
            </p>
            <div
              style={{
                background: '#020C1C',
                border: '1px solid rgba(201,168,76,0.25)',
                borderRadius: '2px',
                padding: '24px 28px',
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-body-new)",
                  fontSize: '16px',
                  fontWeight: 400,
                  color: '#333333',
                  lineHeight: 2,
                }}
              >
                <strong>Email:</strong>{' '}
                <a href="mailto:privacy@nilay360.com" style={{ color: '#10C4C3', textDecoration: 'none' }}>
                  privacy@nilay360.com
                </a>
                <br />
                <strong>Address:</strong> 4th Floor, Trendz Techpark, Road No. 11, Kakatiya Hills, Guttala Begumpet,
                Kavuri Hills, Madhapur, Hyderabad, Telangana 500081.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        style={{
          background: '#05080C',
          padding: '64px 48px 0',
        }}
      >
        {/* 4-column grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '40px',
            maxWidth: '1200px',
            margin: '0 auto',
            paddingBottom: '56px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Column 1 — Properties */}
          <div>
            <h4
              style={{
                fontFamily: "var(--font-heading-new)",
                fontSize: '18px',
                fontWeight: 600,
                color: '#10C4C3',
                marginBottom: '20px',
                letterSpacing: '0.5px',
              }}
            >
              Properties
            </h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {[
                { label: 'Buy', href: '/buy' },
                { label: 'Rent', href: '/rent' },
                { label: 'New Projects', href: '/new-projects' },
                { label: 'Builders', href: '/builders' },
              ].map((link) => (
                <li key={link.href} style={{ marginBottom: '10px' }}>
                  <a
                    href={link.href}
                    style={{
                      fontFamily: "var(--font-body-new)",
                      fontSize: '13px',
                      fontWeight: 400,
                      color: 'rgba(255,255,255,0.55)',
                      textDecoration: 'none',
                    }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2 — Company */}
          <div>
            <h4
              style={{
                fontFamily: "var(--font-heading-new)",
                fontSize: '18px',
                fontWeight: 600,
                color: '#10C4C3',
                marginBottom: '20px',
                letterSpacing: '0.5px',
              }}
            >
              Company
            </h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {[
                { label: 'About Us', href: '/about' },
                { label: 'Our Agents', href: '/agents' },
                { label: 'NRI Services', href: '/nri' },
                { label: 'Contact', href: '/contact' },
              ].map((link) => (
                <li key={link.href} style={{ marginBottom: '10px' }}>
                  <a
                    href={link.href}
                    style={{
                      fontFamily: "var(--font-body-new)",
                      fontSize: '13px',
                      fontWeight: 400,
                      color: 'rgba(255,255,255,0.55)',
                      textDecoration: 'none',
                    }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 — Tools */}
          <div>
            <h4
              style={{
                fontFamily: "var(--font-heading-new)",
                fontSize: '18px',
                fontWeight: 600,
                color: '#10C4C3',
                marginBottom: '20px',
                letterSpacing: '0.5px',
              }}
            >
              Tools
            </h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {[
                { label: 'EMI Calculator', href: '/calculator' },
                { label: 'Compare', href: '/compare' },
                { label: 'Search', href: '/search' },
                { label: 'RERA Guide', href: '/legal-guide' },
                { label: 'Safety Guide', href: '/safety-guide' },
              ].map((link) => (
                <li key={link.href} style={{ marginBottom: '10px' }}>
                  <a
                    href={link.href}
                    style={{
                      fontFamily: "var(--font-body-new)",
                      fontSize: '13px',
                      fontWeight: 400,
                      color: 'rgba(255,255,255,0.55)',
                      textDecoration: 'none',
                    }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4 — Legal */}
          <div>
            <h4
              style={{
                fontFamily: "var(--font-heading-new)",
                fontSize: '18px',
                fontWeight: 600,
                color: '#10C4C3',
                marginBottom: '20px',
                letterSpacing: '0.5px',
              }}
            >
              Legal
            </h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {[
                { label: 'Privacy Policy', href: '/privacy' },
                { label: 'Terms of Service', href: '/terms' },
                { label: 'Cookie Policy', href: '/cookies' },
                { label: 'Legal Guide', href: '/legal-guide' },
                { label: 'Agent Terms', href: '/agent-terms' },
                { label: 'Grievance Redressal', href: '/grievance-redressal' },
              ].map((link) => (
                <li key={link.href} style={{ marginBottom: '10px' }}>
                  <a
                    href={link.href}
                    style={{
                      fontFamily: "var(--font-body-new)",
                      fontSize: '13px',
                      fontWeight: 400,
                      color: 'rgba(255,255,255,0.55)',
                      textDecoration: 'none',
                    }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '24px 0',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-body-new)",
              fontSize: '12px',
              fontWeight: 400,
              color: 'rgba(255,255,255,0.3)',
              letterSpacing: '0.3px',
            }}
          >
            &copy; 2025 Nilay 360 Real Estate Technologies Pvt. Ltd. &middot; CIN: U70100TG2024PTC123456 &middot; All
            rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
}
