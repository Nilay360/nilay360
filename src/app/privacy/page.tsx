import { createClient } from "@/lib/supabase/server";

export default async function PrivacyPage() {
  const supabase = await createClient();
  const { data: contacts } = await supabase
    .from("site_contacts")
    .select("contact_type, label, phone, whatsapp")
    .eq("is_active", true);

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
          Privacy Policy
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
          Last updated: August 24, 2026
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
          {/* Intro */}
          <div style={{ marginBottom: '48px' }}>
            <p
              style={{
                fontFamily: "var(--font-body-new)",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
              }}
            >
              Nilay360 (&ldquo;we,&rdquo; &ldquo;us,&rdquo; &ldquo;our&rdquo;) is a real estate platform operated by
              NIVILA Group, based in Hyderabad, India, accessible via our website (nilay360.com) and our mobile
              application (collectively, the &ldquo;Service&rdquo;). This policy explains what information we
              collect, why we collect it, and how it&rsquo;s handled.
            </p>
          </div>

          {/* Section 1 — Information We Collect */}
          <div style={{ marginBottom: '48px' }}>
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
              1. Information We Collect
            </h2>

            <h3
              style={{
                fontFamily: "var(--font-heading-new)",
                fontSize: '18px',
                fontWeight: 600,
                color: '#020C1C',
                marginBottom: '10px',
              }}
            >
              Information you give us directly
            </h3>
            <p
              style={{
                fontFamily: "var(--font-body-new)",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
                marginBottom: '12px',
              }}
            >
              When you create an account or use the Service, we collect:
            </p>
            <ul
              style={{
                fontFamily: "var(--font-body-new)",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
                paddingLeft: '24px',
                marginBottom: '24px',
              }}
            >
              <li style={{ marginBottom: '10px' }}>
                <strong>Phone number</strong> — required to sign in via OTP (One-Time Password)
              </li>
              <li style={{ marginBottom: '10px' }}>
                <strong>Email address</strong> — collected during Google Sign-In, or optionally added to your profile
              </li>
              <li style={{ marginBottom: '10px' }}>
                <strong>Name and city</strong> — collected to complete your profile after signing in
              </li>
              <li style={{ marginBottom: '10px' }}>
                <strong>Property listing details</strong> — if you list a property, including photos, price,
                location, and description
              </li>
              <li style={{ marginBottom: '10px' }}>
                <strong>Inquiry messages</strong> — if you contact a seller or agent through the platform
              </li>
            </ul>

            <h3
              style={{
                fontFamily: "var(--font-heading-new)",
                fontSize: '18px',
                fontWeight: 600,
                color: '#020C1C',
                marginBottom: '10px',
              }}
            >
              Information collected automatically
            </h3>
            <ul
              style={{
                fontFamily: "var(--font-body-new)",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
                paddingLeft: '24px',
                marginBottom: '24px',
              }}
            >
              <li style={{ marginBottom: '10px' }}>
                <strong>Usage data</strong> — pages visited, features used, general interaction patterns (via
                analytics)
              </li>
              <li style={{ marginBottom: '10px' }}>
                <strong>Device and technical information</strong> — browser type, device type, general diagnostic
                information (via error monitoring)
              </li>
            </ul>

            <h3
              style={{
                fontFamily: "var(--font-heading-new)",
                fontSize: '18px',
                fontWeight: 600,
                color: '#020C1C',
                marginBottom: '10px',
              }}
            >
              Information we do not collect
            </h3>
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
              <li style={{ marginBottom: '10px' }}>
                <strong>Location data</strong> — Nilay360 does not currently request or access your device&rsquo;s
                precise location.
              </li>
            </ul>
          </div>

          {/* Section 2 — How We Use Your Information */}
          <div style={{ marginBottom: '48px' }}>
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
              2. How We Use Your Information
            </h2>
            <p
              style={{
                fontFamily: "var(--font-body-new)",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
                marginBottom: '12px',
              }}
            >
              We use the information collected to:
            </p>
            <ul
              style={{
                fontFamily: "var(--font-body-new)",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
                paddingLeft: '24px',
                marginBottom: '16px',
              }}
            >
              <li style={{ marginBottom: '10px' }}>Create and manage your account</li>
              <li style={{ marginBottom: '10px' }}>Verify your identity during sign-in (via OTP or Google Sign-In)</li>
              <li style={{ marginBottom: '10px' }}>Display your profile and listings to other users, where applicable</li>
              <li style={{ marginBottom: '10px' }}>Connect buyers/renters with sellers and agents through inquiries</li>
              <li style={{ marginBottom: '10px' }}>
                Send transactional notifications (e.g., inquiry confirmations, listing status updates)
              </li>
              <li style={{ marginBottom: '10px' }}>Monitor and improve the performance and reliability of the Service</li>
              <li style={{ marginBottom: '10px' }}>
                Understand how the Service is used, in aggregate, to guide improvements
              </li>
            </ul>
            <p
              style={{
                fontFamily: "var(--font-body-new)",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
              }}
            >
              We do not sell your personal information to third parties.
            </p>
          </div>

          {/* Section 3 — Third-Party Service Providers */}
          <div style={{ marginBottom: '48px' }}>
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
              3. Third-Party Service Providers
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
              Nilay360 relies on a small number of specialist service providers to operate. Each has access only to
              the specific data needed to perform its function:
            </p>
            <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontFamily: "var(--font-body-new)",
                  fontSize: '14px',
                  color: '#333333',
                }}
              >
                <thead>
                  <tr style={{ background: '#020C1C' }}>
                    {['Provider', 'What It Does', 'Data It Processes'].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: 'left',
                          padding: '12px 14px',
                          color: '#10C4C3',
                          fontWeight: 600,
                          borderBottom: '2px solid #10C4C3',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Supabase', 'Our database, authentication system, and file storage', 'Account details, listing data, uploaded files'],
                    ['MSG91', 'Sends the SMS one-time password (OTP) used for phone sign-in', 'Phone number'],
                    ['Google', 'Provides the "Sign in with Google" option', 'Email address, basic profile information (only if you choose this sign-in method)'],
                    ['Cloudinary', 'Hosts and optimizes property photos', 'Uploaded property images'],
                    ['Resend', 'Sends transactional emails (e.g., inquiry notifications)', 'Email address, message content related to the notification'],
                    ['Vercel', 'Hosts and serves the Nilay360 website and application', 'Standard web request data (e.g., IP address, as part of normal web traffic)'],
                    ['Sentry', 'Monitors for technical errors so we can fix them', 'Technical diagnostic information; may incidentally include limited account context if an error occurs during your session'],
                    ['PostHog', 'Provides anonymized usage analytics', 'General usage patterns, not tied to your identity for marketing purposes'],
                  ].map((row) => (
                    <tr key={row[0]} style={{ borderBottom: '1px solid #e5e5e5' }}>
                      {row.map((cell, i) => (
                        <td key={i} style={{ padding: '12px 14px', lineHeight: 1.6, verticalAlign: 'top' }}>
                          {i === 0 ? <strong>{cell}</strong> : cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p
              style={{
                fontFamily: "var(--font-body-new)",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
              }}
            >
              We do not permit these providers to use your data for their own independent purposes beyond providing
              their service to us.
            </p>
          </div>

          {/* Section 4 — Data Sharing */}
          <div style={{ marginBottom: '48px' }}>
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
              4. Data Sharing
            </h2>
            <p
              style={{
                fontFamily: "var(--font-body-new)",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
                marginBottom: '12px',
              }}
            >
              We share your information only:
            </p>
            <ul
              style={{
                fontFamily: "var(--font-body-new)",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
                paddingLeft: '24px',
                marginBottom: '16px',
              }}
            >
              <li style={{ marginBottom: '10px' }}>
                With the third-party service providers listed above, strictly to operate the Service
              </li>
              <li style={{ marginBottom: '10px' }}>
                With a seller or agent, if you submit an inquiry about their listing (your name and contact details
                are shared so they can respond to you)
              </li>
              <li style={{ marginBottom: '10px' }}>If required by law, regulation, or a valid legal request</li>
            </ul>
            <p
              style={{
                fontFamily: "var(--font-body-new)",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
              }}
            >
              We do not sell, rent, or trade your personal information to advertisers or data brokers.
            </p>
          </div>

          {/* Section 5 — Data Retention */}
          <div style={{ marginBottom: '48px' }}>
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
              5. Data Retention
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
              We retain your account information for as long as your account remains active. If you delete your
              account, we will delete or anonymize your personal information within a reasonable timeframe, except
              where we are required to retain certain records for legal or regulatory purposes.
            </p>
          </div>

          {/* Section 6 — Your Rights */}
          <div style={{ marginBottom: '48px' }}>
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
              6. Your Rights
            </h2>
            <p
              style={{
                fontFamily: "var(--font-body-new)",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
                marginBottom: '12px',
              }}
            >
              You have the right to:
            </p>
            <ul
              style={{
                fontFamily: "var(--font-body-new)",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
                paddingLeft: '24px',
                marginBottom: '16px',
              }}
            >
              <li style={{ marginBottom: '10px' }}>
                <strong>Access</strong> the personal information we hold about you
              </li>
              <li style={{ marginBottom: '10px' }}>
                <strong>Correct</strong> inaccurate information via your profile settings
              </li>
              <li style={{ marginBottom: '10px' }}>
                <strong>Delete</strong> your account and associated personal data
              </li>
              <li style={{ marginBottom: '10px' }}>
                <strong>Ask questions</strong> about how your data is used
              </li>
            </ul>
            <p
              style={{
                fontFamily: "var(--font-body-new)",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
              }}
            >
              To exercise any of these rights, contact us at{' '}
              <a href="mailto:contact@nilay360.com" style={{ color: '#10C4C3', textDecoration: 'none' }}>
                contact@nilay360.com
              </a>
              .
            </p>
          </div>

          {/* Section 7 — Data Security */}
          <div style={{ marginBottom: '48px' }}>
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
              7. Data Security
            </h2>
            <p
              style={{
                fontFamily: "var(--font-body-new)",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
                marginBottom: '12px',
              }}
            >
              We take reasonable technical and organizational measures to protect your information, including:
            </p>
            <ul
              style={{
                fontFamily: "var(--font-body-new)",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
                paddingLeft: '24px',
                marginBottom: '16px',
              }}
            >
              <li style={{ marginBottom: '8px' }}>Encrypted data transmission (HTTPS) across the entire Service</li>
              <li style={{ marginBottom: '8px' }}>Row-level database security restricting who can access which data</li>
              <li style={{ marginBottom: '8px' }}>Restricted internal access to production systems</li>
            </ul>
            <p
              style={{
                fontFamily: "var(--font-body-new)",
                fontSize: '16px',
                fontWeight: 400,
                color: '#333333',
                lineHeight: 1.8,
              }}
            >
              No method of transmission or storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </div>

          {/* Section 8 — Children's Privacy */}
          <div style={{ marginBottom: '48px' }}>
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
              8. Children&rsquo;s Privacy
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
              Nilay360 is intended for users who are at least 18 years old. We do not knowingly collect personal
              information from children. If you believe a child has provided us with personal information, please
              contact us so we can remove it.
            </p>
          </div>

          {/* Section 9 — International Data Storage */}
          <div style={{ marginBottom: '48px' }}>
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
              9. International Data Storage
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
              Some of our service providers (listed in Section 3) may store or process data on servers located
              outside India. We take steps to ensure these providers maintain appropriate data protection standards.
            </p>
          </div>

          {/* Section 10 — Changes to This Policy */}
          <div style={{ marginBottom: '48px' }}>
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
              10. Changes to This Policy
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
              We may update this policy from time to time. If we make material changes, we will update the
              &ldquo;Last updated&rdquo; date above. Continued use of the Service after changes take effect
              constitutes acceptance of the updated policy.
            </p>
          </div>

          {/* Section 11 — Contact Us */}
          <div style={{ marginBottom: '0' }}>
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
              11. Contact Us
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
              If you have questions about this Privacy Policy or how your data is handled, contact us at:
            </p>
            <div
              style={{
                background: '#020C1C',
                border: '1px solid rgba(16,196,195,0.25)',
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
                <a href="mailto:contact@nilay360.com" style={{ color: '#10C4C3', textDecoration: 'none' }}>
                  contact@nilay360.com
                </a>
                {contacts?.map(c => (
                  <span key={c.contact_type}>
                    <br />
                    <strong>{c.label}:</strong> {c.phone}
                    {c.whatsapp && c.whatsapp !== c.phone && <> (WhatsApp: {c.whatsapp})</>}
                  </span>
                ))}
                <br />
                <strong>Address:</strong> 4th Floor, Trendz Techpark, Road No. 11, Kakatiya Hills, Guttala Begumpet,
                Kavuri Hills, Madhapur, Hyderabad, Telangana 500081
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
