export default function PrivacyPage() {
  return (
    <>
      <style>{`

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Cal Sans', sans-serif;
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
            fontFamily: "'Cal Sans', serif",
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
                fontFamily: "'Cal Sans', sans-serif",
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
              fontFamily: "'Cal Sans', sans-serif",
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
              fontFamily: "'Cal Sans', sans-serif",
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
            fontFamily: "'Cal Sans', sans-serif",
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
            fontFamily: "'Cal Sans', serif",
            fontSize: '64px',
            fontWeight: 600,
            color: '#ffffff',
            lineHeight: 1.1,
            marginBottom: '20px',
          }}
        >
          Privacy Policy
        </h1>
        <p
          style={{
            fontFamily: "'Cal Sans', sans-serif",
            fontSize: '15px',
            fontWeight: 400,
            color: 'rgba(255,255,255,0.6)',
            letterSpacing: '0.3px',
          }}
        >
          Last updated: June 2025 · DPDP Act 2023 Compliant
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
            boxShadow: '0 2px 40px rgba(0,0,0,0.06)',
          }}
        >
          {/* Section 1 — Introduction */}
          <div style={{ marginBottom: '48px' }}>
            <h2
              style={{
                fontFamily: "'Cal Sans', serif",
                fontSize: '36px',
                fontWeight: 600,
                color: '#020C1C',
                borderBottom: '2px solid #10C4C3',
                paddingBottom: '12px',
                marginBottom: '20px',
              }}
            >
              1. Introduction
            </h2>
            <p
              style={{
                fontFamily: "'Cal Sans', sans-serif",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
              }}
            >
              Nilay 360 Real Estate Technologies Private Limited (&ldquo;Nilay 360&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;,
              &ldquo;us&rdquo;) is a premium real estate discovery platform headquartered in Hyderabad, Telangana, India.
              This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when
              you use our website (www.nilay360.com), mobile applications, and related services (collectively, the
              &ldquo;Platform&rdquo;). We are committed to protecting your privacy in accordance with the Digital
              Personal Data Protection Act, 2023 (&ldquo;DPDP Act&rdquo;), the Information Technology Act, 2000, and
              applicable rules thereunder. By accessing or using the Platform, you acknowledge that you have read and
              understood this Privacy Policy.
            </p>
          </div>

          {/* Section 2 — Information We Collect */}
          <div style={{ marginBottom: '48px' }}>
            <h2
              style={{
                fontFamily: "'Cal Sans', serif",
                fontSize: '36px',
                fontWeight: 600,
                color: '#020C1C',
                borderBottom: '2px solid #10C4C3',
                paddingBottom: '12px',
                marginBottom: '20px',
              }}
            >
              2. Information We Collect
            </h2>
            <p
              style={{
                fontFamily: "'Cal Sans', sans-serif",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
                marginBottom: '12px',
              }}
            >
              We collect the following categories of personal data:
            </p>
            <ul
              style={{
                fontFamily: "'Cal Sans', sans-serif",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
                paddingLeft: '24px',
              }}
            >
              <li style={{ marginBottom: '10px' }}>
                <strong>Identity &amp; Contact Information:</strong> name, email address, phone number, date of birth
                (for age verification), and PAN/Aadhaar details where required for KYC.
              </li>
              <li style={{ marginBottom: '10px' }}>
                <strong>Property Preferences:</strong> search history, saved properties, budget range, preferred
                locations, and property type preferences.
              </li>
              <li style={{ marginBottom: '10px' }}>
                <strong>Device &amp; Technical Information:</strong> IP address, browser type, operating system, device
                identifiers, and pages visited.
              </li>
              <li style={{ marginBottom: '10px' }}>
                <strong>Location Data:</strong> approximate location derived from IP, and precise GPS location only if
                you explicitly grant permission.
              </li>
              <li style={{ marginBottom: '10px' }}>
                <strong>Communications:</strong> messages sent through our platform to agents or developers, support
                enquiries, and feedback.
              </li>
              <li style={{ marginBottom: '10px' }}>
                <strong>Financial Information:</strong> we do not store payment card details; transactions are processed
                through PCI-DSS compliant third-party gateways.
              </li>
            </ul>
          </div>

          {/* Section 3 — How We Use Your Information */}
          <div style={{ marginBottom: '48px' }}>
            <h2
              style={{
                fontFamily: "'Cal Sans', serif",
                fontSize: '36px',
                fontWeight: 600,
                color: '#020C1C',
                borderBottom: '2px solid #10C4C3',
                paddingBottom: '12px',
                marginBottom: '20px',
              }}
            >
              3. How We Use Your Information
            </h2>
            <p
              style={{
                fontFamily: "'Cal Sans', sans-serif",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
                marginBottom: '12px',
              }}
            >
              We use your personal data for the following purposes:
            </p>
            <ul
              style={{
                fontFamily: "'Cal Sans', sans-serif",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
                paddingLeft: '24px',
              }}
            >
              <li style={{ marginBottom: '10px' }}>
                <strong>Service Delivery:</strong> matching you with relevant properties, connecting you with verified
                agents and developers.
              </li>
              <li style={{ marginBottom: '10px' }}>
                <strong>Account Management:</strong> creating and maintaining your account, authenticating your
                identity.
              </li>
              <li style={{ marginBottom: '10px' }}>
                <strong>Communications:</strong> sending property alerts, enquiry responses, transaction updates, and
                service announcements.
              </li>
              <li style={{ marginBottom: '10px' }}>
                <strong>Analytics &amp; Improvement:</strong> understanding how users interact with the Platform to
                improve features, fix bugs, and personalise experiences.
              </li>
              <li style={{ marginBottom: '10px' }}>
                <strong>Legal Compliance:</strong> fulfilling obligations under RERA, PMLA, income tax laws, and court
                orders.
              </li>
              <li style={{ marginBottom: '10px' }}>
                <strong>Marketing (with consent):</strong> sending promotional emails about new listings, market
                insights, and Nilay 360 services — you may opt out at any time.
              </li>
            </ul>
          </div>

          {/* Section 4 — Sharing Your Information */}
          <div style={{ marginBottom: '48px' }}>
            <h2
              style={{
                fontFamily: "'Cal Sans', serif",
                fontSize: '36px',
                fontWeight: 600,
                color: '#020C1C',
                borderBottom: '2px solid #10C4C3',
                paddingBottom: '12px',
                marginBottom: '20px',
              }}
            >
              4. Sharing Your Information
            </h2>
            <p
              style={{
                fontFamily: "'Cal Sans', sans-serif",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
                marginBottom: '12px',
              }}
            >
              We do not sell your personal data. We share your information only in the following circumstances:
            </p>
            <ul
              style={{
                fontFamily: "'Cal Sans', sans-serif",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
                paddingLeft: '24px',
              }}
            >
              <li style={{ marginBottom: '10px' }}>
                <strong>Verified Agents &amp; Developers:</strong> your contact details are shared with a property
                agent or developer only when you initiate an enquiry or explicitly consent.
              </li>
              <li style={{ marginBottom: '10px' }}>
                <strong>Service Providers:</strong> trusted vendors (cloud hosting, email delivery, analytics, customer
                support) who process data on our behalf under strict data processing agreements and non-disclosure
                obligations.
              </li>
              <li style={{ marginBottom: '10px' }}>
                <strong>Legal Requirements:</strong> when required by law, court order, government directive, or to
                protect the rights, property, or safety of Nilay 360, our users, or the public.
              </li>
              <li style={{ marginBottom: '10px' }}>
                <strong>Business Transfers:</strong> in connection with a merger, acquisition, or sale of assets,
                subject to the acquirer maintaining equivalent privacy protections.
              </li>
            </ul>
          </div>

          {/* Section 5 — Your Rights Under DPDP Act 2023 */}
          <div style={{ marginBottom: '48px' }}>
            <h2
              style={{
                fontFamily: "'Cal Sans', serif",
                fontSize: '36px',
                fontWeight: 600,
                color: '#020C1C',
                borderBottom: '2px solid #10C4C3',
                paddingBottom: '12px',
                marginBottom: '20px',
              }}
            >
              5. Your Rights Under DPDP Act 2023
            </h2>
            <p
              style={{
                fontFamily: "'Cal Sans', sans-serif",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
                marginBottom: '12px',
              }}
            >
              Under the Digital Personal Data Protection Act, 2023, you have the following rights as a Data Principal:
            </p>
            <ul
              style={{
                fontFamily: "'Cal Sans', sans-serif",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
                paddingLeft: '24px',
              }}
            >
              <li style={{ marginBottom: '10px' }}>
                <strong>Right to Access:</strong> request a summary of the personal data we hold about you and the
                purposes for which it is processed.
              </li>
              <li style={{ marginBottom: '10px' }}>
                <strong>Right to Correction:</strong> request correction of inaccurate or incomplete personal data.
              </li>
              <li style={{ marginBottom: '10px' }}>
                <strong>Right to Erasure:</strong> request deletion of your personal data when it is no longer
                necessary for the purpose it was collected, subject to legal retention obligations.
              </li>
              <li style={{ marginBottom: '10px' }}>
                <strong>Right to Withdraw Consent:</strong> withdraw consent at any time for processing activities
                based on consent — withdrawal does not affect the lawfulness of prior processing.
              </li>
              <li style={{ marginBottom: '10px' }}>
                <strong>Right to Grievance Redressal:</strong> raise a complaint with our Data Protection Officer
                (details in Section 8) within 30 days of the relevant event.
              </li>
              <li style={{ marginBottom: '10px' }}>
                <strong>Right to Nominate:</strong> nominate another individual to exercise rights on your behalf in
                the event of death or incapacity.
              </li>
            </ul>
            <p
              style={{
                fontFamily: "'Cal Sans', sans-serif",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
                marginTop: '16px',
              }}
            >
              To exercise any of these rights, email{' '}
              <a href="mailto:privacy@nilay360.com" style={{ color: '#10C4C3', textDecoration: 'none' }}>
                privacy@nilay360.com
              </a>{' '}
              with the subject line &ldquo;DPDP Rights Request&rdquo; and your registered email address. We will
              respond within 30 days.
            </p>
          </div>

          {/* Section 6 — Cookies */}
          <div style={{ marginBottom: '48px' }}>
            <h2
              style={{
                fontFamily: "'Cal Sans', serif",
                fontSize: '36px',
                fontWeight: 600,
                color: '#020C1C',
                borderBottom: '2px solid #10C4C3',
                paddingBottom: '12px',
                marginBottom: '20px',
              }}
            >
              6. Cookies
            </h2>
            <p
              style={{
                fontFamily: "'Cal Sans', sans-serif",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
              }}
            >
              We use cookies and similar tracking technologies to enhance your browsing experience, analyse traffic, and
              personalise content. Essential cookies are necessary for the Platform to function. Analytics and marketing
              cookies are used only with your consent. For detailed information on the types of cookies we use and how
              to manage your preferences, please read our Cookie Policy at{' '}
              <a href="/cookies" style={{ color: '#10C4C3', textDecoration: 'none' }}>
                www.nilay360.com/cookies
              </a>
              .
            </p>
          </div>

          {/* Section 7 — Data Security */}
          <div style={{ marginBottom: '48px' }}>
            <h2
              style={{
                fontFamily: "'Cal Sans', serif",
                fontSize: '36px',
                fontWeight: 600,
                color: '#020C1C',
                borderBottom: '2px solid #10C4C3',
                paddingBottom: '12px',
                marginBottom: '20px',
              }}
            >
              7. Data Security
            </h2>
            <p
              style={{
                fontFamily: "'Cal Sans', sans-serif",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
                marginBottom: '12px',
              }}
            >
              We implement industry-standard security measures including:
            </p>
            <ul
              style={{
                fontFamily: "'Cal Sans', sans-serif",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
                paddingLeft: '24px',
                marginBottom: '16px',
              }}
            >
              <li style={{ marginBottom: '8px' }}>AES-256 encryption for data at rest.</li>
              <li style={{ marginBottom: '8px' }}>TLS 1.3 encryption for data in transit.</li>
              <li style={{ marginBottom: '8px' }}>
                Role-based access controls limiting employee access to personal data.
              </li>
              <li style={{ marginBottom: '8px' }}>Regular security audits and penetration testing.</li>
              <li style={{ marginBottom: '8px' }}>Multi-factor authentication for internal systems.</li>
            </ul>
            <p
              style={{
                fontFamily: "'Cal Sans', sans-serif",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
              }}
            >
              In the event of a personal data breach that is likely to result in harm to Data Principals, we will
              notify the Data Protection Board of India and affected users within 72 hours of becoming aware of the
              breach, as required under the DPDP Act, 2023.
            </p>
          </div>

          {/* Section 8 — Contact Our Data Protection Officer */}
          <div style={{ marginBottom: '0' }}>
            <h2
              style={{
                fontFamily: "'Cal Sans', serif",
                fontSize: '36px',
                fontWeight: 600,
                color: '#020C1C',
                borderBottom: '2px solid #10C4C3',
                paddingBottom: '12px',
                marginBottom: '20px',
              }}
            >
              8. Contact Our Data Protection Officer
            </h2>
            <p
              style={{
                fontFamily: "'Cal Sans', sans-serif",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
                marginBottom: '16px',
              }}
            >
              For privacy-related queries, requests, or complaints, please contact our Data Protection Officer:
            </p>
            <div
              style={{
                background: '#020C1C',
                border: '1px solid rgba(201,168,76,0.25)',
                borderRadius: '2px',
                padding: '24px 28px',
                marginBottom: '20px',
              }}
            >
              <p
                style={{
                  fontFamily: "'Cal Sans', sans-serif",
                  fontSize: '16px',
                  fontWeight: 400,
                  color: '#333333',
                  lineHeight: 2,
                }}
              >
                <strong>Name:</strong> Data Protection Officer
                <br />
                <strong>Organisation:</strong> Nilay 360 Real Estate Technologies Pvt. Ltd.
                <br />
                <strong>Email:</strong>{' '}
                <a href="mailto:privacy@nilay360.com" style={{ color: '#10C4C3', textDecoration: 'none' }}>
                  privacy@nilay360.com
                </a>
                <br />
                <strong>Address:</strong> 8th Floor, Prestige Cyber Towers, Hitec City, Hyderabad — 500081,
                Telangana, India.
              </p>
            </div>
            <p
              style={{
                fontFamily: "'Cal Sans', sans-serif",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
              }}
            >
              If you are not satisfied with our response, you may lodge a complaint with the Data Protection Board of
              India at{' '}
              <a
                href="https://www.dataprotection.gov.in"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#10C4C3', textDecoration: 'none' }}
              >
                www.dataprotection.gov.in
              </a>
              .
            </p>
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
                fontFamily: "'Cal Sans', serif",
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
                      fontFamily: "'Cal Sans', sans-serif",
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
                fontFamily: "'Cal Sans', serif",
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
                      fontFamily: "'Cal Sans', sans-serif",
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
                fontFamily: "'Cal Sans', serif",
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
              ].map((link) => (
                <li key={link.href} style={{ marginBottom: '10px' }}>
                  <a
                    href={link.href}
                    style={{
                      fontFamily: "'Cal Sans', sans-serif",
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
                fontFamily: "'Cal Sans', serif",
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
              ].map((link) => (
                <li key={link.href} style={{ marginBottom: '10px' }}>
                  <a
                    href={link.href}
                    style={{
                      fontFamily: "'Cal Sans', sans-serif",
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
              fontFamily: "'Cal Sans', sans-serif",
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
