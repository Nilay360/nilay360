
<style>{`
`}</style>

export default function TermsPage() {
  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Cal Sans', sans-serif; }
      `}</style>

      {/* NAVBAR */}
      <nav style={{
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
      }}>
        <a href="/" style={{
          fontFamily: "'Cal Sans', serif",
          fontSize: '24px',
          fontWeight: 600,
          color: '#10C4C3',
          textDecoration: 'none',
          letterSpacing: '2px',
        }}>
          Nilay 360 ·
        </a>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '32px',
        }}>
          {[
            { label: 'Home', href: '/' },
            { label: 'Properties', href: '/properties' },
            { label: 'New Projects', href: '/new-projects' },
            { label: 'Agents', href: '/agents' },
            { label: 'Locations', href: '/locations' },
            { label: 'Contact', href: '/contact' },
          ].map((link) => (
            <a key={link.href} href={link.href} style={{
              fontFamily: "'Cal Sans', sans-serif",
              fontSize: '14px',
              fontWeight: 400,
              color: 'rgba(255,255,255,0.8)',
              textDecoration: 'none',
              letterSpacing: '0.3px',
              transition: 'color 0.2s',
            }}>
              {link.label}
            </a>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <a href="/login" style={{
            fontFamily: "'Cal Sans', sans-serif",
            fontSize: '14px',
            fontWeight: 500,
            color: '#10C4C3',
            textDecoration: 'none',
            border: '1px solid #10C4C3',
            padding: '8px 20px',
            borderRadius: '2px',
            letterSpacing: '0.3px',
          }}>
            Sign In
          </a>
          <a href="/post-property" style={{
            fontFamily: "'Cal Sans', sans-serif",
            fontSize: '14px',
            fontWeight: 500,
            color: '#05080C',
            textDecoration: 'none',
            background: '#10C4C3',
            padding: '8px 20px',
            borderRadius: '2px',
            letterSpacing: '0.3px',
          }}>
            List Property
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        background: '#020C1C',
        paddingTop: '140px',
        paddingBottom: '72px',
        textAlign: 'center',
      }}>
        <p style={{
          fontFamily: "'Cal Sans', sans-serif",
          fontSize: '12px',
          fontWeight: 500,
          color: '#10C4C3',
          letterSpacing: '4px',
          textTransform: 'uppercase',
          marginBottom: '20px',
        }}>
          LEGAL
        </p>
        <h1 style={{
          fontFamily: "'Cal Sans', serif",
          fontSize: '64px',
          fontWeight: 600,
          color: '#FFFFFF',
          lineHeight: 1.1,
          marginBottom: '20px',
          letterSpacing: '-0.5px',
        }}>
          Terms of Service
        </h1>
        <p style={{
          fontFamily: "'Cal Sans', sans-serif",
          fontSize: '16px',
          fontWeight: 300,
          color: 'rgba(255,255,255,0.6)',
          letterSpacing: '0.2px',
        }}>
          Last updated: June 2025
        </p>
      </section>

      {/* CONTENT */}
      <section style={{
        background: '#020C1C',
        padding: '72px 24px',
      }}>
        <div style={{
          background: '#FFFFFF',
          maxWidth: '820px',
          margin: '0 auto',
          padding: '56px',
          borderRadius: '2px',
          boxShadow: '0 2px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
        }}>

          {/* Section 1 */}
          <div style={{ marginBottom: '48px' }}>
            <p style={{
              fontFamily: "'Cal Sans', sans-serif",
              fontSize: '12px',
              fontWeight: 600,
              color: '#10C4C3',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}>01</p>
            <h2 style={{
              fontFamily: "'Cal Sans', serif",
              fontSize: '36px',
              fontWeight: 600,
              color: '#020C1C',
              borderBottom: '2px solid #10C4C3',
              paddingBottom: '12px',
              marginBottom: '20px',
              lineHeight: 1.2,
            }}>
              Acceptance of Terms
            </h2>
            <p style={{
              fontFamily: "'Cal Sans', sans-serif",
              fontSize: '16px',
              fontWeight: 400,
              color: '#333333',
              lineHeight: 1.8,
            }}>
              By accessing or using the Nilay 360 platform (www.nilay360.com), mobile applications, or any related services (collectively, the &ldquo;Platform&rdquo;), you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;) and our Privacy Policy, which is incorporated herein by reference. If you do not agree to these Terms, you must immediately cease using the Platform. These Terms constitute a legally binding agreement between you (&ldquo;User&rdquo;) and Nilay 360 Real Estate Technologies Private Limited (&ldquo;Nilay 360&rdquo;, &ldquo;Company&rdquo;), a company incorporated under the Companies Act, 2013, with its registered office at 8th Floor, Prestige Cyber Towers, Hitec City, Hyderabad &mdash; 500081, Telangana, India.
            </p>
          </div>

          {/* Section 2 */}
          <div style={{ marginBottom: '48px' }}>
            <p style={{
              fontFamily: "'Cal Sans', sans-serif",
              fontSize: '12px',
              fontWeight: 600,
              color: '#10C4C3',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}>02</p>
            <h2 style={{
              fontFamily: "'Cal Sans', serif",
              fontSize: '36px',
              fontWeight: 600,
              color: '#020C1C',
              borderBottom: '2px solid #10C4C3',
              paddingBottom: '12px',
              marginBottom: '20px',
              lineHeight: 1.2,
            }}>
              Platform Usage
            </h2>
            <p style={{
              fontFamily: "'Cal Sans', sans-serif",
              fontSize: '16px',
              fontWeight: 400,
              color: '#333333',
              lineHeight: 1.8,
              marginBottom: '16px',
            }}>
              <strong style={{ fontWeight: 600 }}>(a) Eligibility:</strong> You must be at least 18 years of age and legally competent to enter into contracts under the Indian Contract Act, 1872 to use the Platform. Registered businesses must be duly incorporated or registered under applicable Indian law.
            </p>
            <p style={{
              fontFamily: "'Cal Sans', sans-serif",
              fontSize: '16px',
              fontWeight: 400,
              color: '#333333',
              lineHeight: 1.8,
              marginBottom: '16px',
            }}>
              <strong style={{ fontWeight: 600 }}>(b) Permitted Use:</strong> You may use the Platform solely for lawful purposes related to buying, selling, renting, or discovering real estate properties in India.
            </p>
            <p style={{
              fontFamily: "'Cal Sans', sans-serif",
              fontSize: '16px',
              fontWeight: 400,
              color: '#333333',
              lineHeight: 1.8,
            }}>
              <strong style={{ fontWeight: 600 }}>(c) Prohibited Activities:</strong> You must not: post false, misleading, or fraudulent property listings; impersonate any person or entity, or falsely claim affiliation with any agent, developer, or RERA authority; scrape, crawl, or systematically extract data from the Platform without express written permission; transmit spam, unsolicited commercial communications, or malicious code; circumvent authentication systems or attempt unauthorised access to any part of the Platform; use the Platform for money laundering, benami transactions, or any activity prohibited under PMLA, 2002 or the Benami Transactions (Prohibition) Act, 1988.
            </p>
          </div>

          {/* Section 3 */}
          <div style={{ marginBottom: '48px' }}>
            <p style={{
              fontFamily: "'Cal Sans', sans-serif",
              fontSize: '12px',
              fontWeight: 600,
              color: '#10C4C3',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}>03</p>
            <h2 style={{
              fontFamily: "'Cal Sans', serif",
              fontSize: '36px',
              fontWeight: 600,
              color: '#020C1C',
              borderBottom: '2px solid #10C4C3',
              paddingBottom: '12px',
              marginBottom: '20px',
              lineHeight: 1.2,
            }}>
              Listing Obligations
            </h2>
            <p style={{
              fontFamily: "'Cal Sans', sans-serif",
              fontSize: '16px',
              fontWeight: 400,
              color: '#333333',
              lineHeight: 1.8,
            }}>
              Any User who posts a property listing (&ldquo;Listing&rdquo;) on the Platform represents and warrants that: (a) they have clear, marketable, and unencumbered legal title to the property, or are authorised to list it on behalf of the title holder; (b) all information in the Listing, including price, area, location, amenities, RERA registration number, and photographs, is accurate, complete, and not misleading; (c) for residential or commercial projects requiring RERA registration under the Real Estate (Regulation and Development) Act, 2016, a valid RERA registration number is prominently displayed; (d) agent listings comply with the RERA agent registration requirements of the relevant state; (e) the Listing does not violate any third-party intellectual property rights; and (f) the property has received all requisite approvals including building plan sanction, RERA registration (where applicable), and Occupancy Certificate (OC) for completed projects.
            </p>
          </div>

          {/* Section 4 */}
          <div style={{ marginBottom: '48px' }}>
            <p style={{
              fontFamily: "'Cal Sans', sans-serif",
              fontSize: '12px',
              fontWeight: 600,
              color: '#10C4C3',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}>04</p>
            <h2 style={{
              fontFamily: "'Cal Sans', serif",
              fontSize: '36px',
              fontWeight: 600,
              color: '#020C1C',
              borderBottom: '2px solid #10C4C3',
              paddingBottom: '12px',
              marginBottom: '20px',
              lineHeight: 1.2,
            }}>
              Buyer Responsibilities
            </h2>
            <p style={{
              fontFamily: "'Cal Sans', sans-serif",
              fontSize: '16px',
              fontWeight: 400,
              color: '#333333',
              lineHeight: 1.8,
            }}>
              Nilay 360 is a discovery and facilitation platform and does not verify the accuracy of Listings or act as a party to any real estate transaction. As a buyer or tenant, you acknowledge and agree that: (a) you are solely responsible for conducting independent due diligence on any property before making any commitment or payment; (b) you should independently verify RERA registration on the relevant state portal, title documents through a qualified advocate, encumbrance certificates from the sub-registrar&rsquo;s office, and approvals from local authorities; (c) you should seek independent legal, financial, and technical advice before entering into any sale agreement, lease, or other transaction; (d) Nilay 360&rsquo;s display of a RERA number does not constitute endorsement or verification of the project; and (e) any disputes arising from transactions must be resolved directly with the seller, agent, or developer, or through appropriate legal forums.
            </p>
          </div>

          {/* Section 5 */}
          <div style={{ marginBottom: '48px' }}>
            <p style={{
              fontFamily: "'Cal Sans', sans-serif",
              fontSize: '12px',
              fontWeight: 600,
              color: '#10C4C3',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}>05</p>
            <h2 style={{
              fontFamily: "'Cal Sans', serif",
              fontSize: '36px',
              fontWeight: 600,
              color: '#020C1C',
              borderBottom: '2px solid #10C4C3',
              paddingBottom: '12px',
              marginBottom: '20px',
              lineHeight: 1.2,
            }}>
              Intellectual Property
            </h2>
            <p style={{
              fontFamily: "'Cal Sans', sans-serif",
              fontSize: '16px',
              fontWeight: 400,
              color: '#333333',
              lineHeight: 1.8,
              marginBottom: '16px',
            }}>
              <strong style={{ fontWeight: 600 }}>(a) Nilay 360 Content:</strong> All content on the Platform created by Nilay 360, including but not limited to logos, trademarks, design elements, software, market reports, neighbourhood guides, and editorial content, is the exclusive intellectual property of Nilay 360 Real Estate Technologies Private Limited or its licensors, protected under the Copyright Act, 1957 and the Trade Marks Act, 1999. You may not reproduce, distribute, or create derivative works without prior written consent.
            </p>
            <p style={{
              fontFamily: "'Cal Sans', sans-serif",
              fontSize: '16px',
              fontWeight: 400,
              color: '#333333',
              lineHeight: 1.8,
              marginBottom: '16px',
            }}>
              <strong style={{ fontWeight: 600 }}>(b) User Content:</strong> You retain ownership of the content you upload to the Platform (photographs, property descriptions, etc.). By posting content, you grant Nilay 360 a non-exclusive, royalty-free, worldwide licence to use, display, and distribute such content for the purpose of operating and promoting the Platform.
            </p>
            <p style={{
              fontFamily: "'Cal Sans', sans-serif",
              fontSize: '16px',
              fontWeight: 400,
              color: '#333333',
              lineHeight: 1.8,
            }}>
              <strong style={{ fontWeight: 600 }}>(c) Feedback:</strong> Any suggestions or feedback you provide may be used by Nilay 360 without restriction or compensation.
            </p>
          </div>

          {/* Section 6 */}
          <div style={{ marginBottom: '48px' }}>
            <p style={{
              fontFamily: "'Cal Sans', sans-serif",
              fontSize: '12px',
              fontWeight: 600,
              color: '#10C4C3',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}>06</p>
            <h2 style={{
              fontFamily: "'Cal Sans', serif",
              fontSize: '36px',
              fontWeight: 600,
              color: '#020C1C',
              borderBottom: '2px solid #10C4C3',
              paddingBottom: '12px',
              marginBottom: '20px',
              lineHeight: 1.2,
            }}>
              Limitation of Liability
            </h2>
            <p style={{
              fontFamily: "'Cal Sans', sans-serif",
              fontSize: '16px',
              fontWeight: 400,
              color: '#333333',
              lineHeight: 1.8,
            }}>
              Nilay 360 operates as an online marketplace and is not a party to any transaction between buyers, sellers, agents, or developers. To the fullest extent permitted by applicable law: (a) Nilay 360 provides the Platform on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, or accuracy of Listings; (b) Nilay 360 shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of the Platform or any transaction facilitated through it; (c) Nilay 360&rsquo;s total aggregate liability to any User for any cause whatsoever shall not exceed the amount paid by such User to Nilay 360 in the twelve (12) months preceding the claim, or INR 10,000, whichever is lower; (d) Nothing in these Terms shall exclude liability for death or personal injury caused by Nilay 360&rsquo;s negligence, or for fraud or wilful misconduct.
            </p>
          </div>

          {/* Section 7 */}
          <div style={{ marginBottom: '48px' }}>
            <p style={{
              fontFamily: "'Cal Sans', sans-serif",
              fontSize: '12px',
              fontWeight: 600,
              color: '#10C4C3',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}>07</p>
            <h2 style={{
              fontFamily: "'Cal Sans', serif",
              fontSize: '36px',
              fontWeight: 600,
              color: '#020C1C',
              borderBottom: '2px solid #10C4C3',
              paddingBottom: '12px',
              marginBottom: '20px',
              lineHeight: 1.2,
            }}>
              Dispute Resolution
            </h2>
            <p style={{
              fontFamily: "'Cal Sans', sans-serif",
              fontSize: '16px',
              fontWeight: 400,
              color: '#333333',
              lineHeight: 1.8,
              marginBottom: '16px',
            }}>
              <strong style={{ fontWeight: 600 }}>(a) Good Faith Resolution:</strong> In the event of any dispute, claim, or controversy arising out of or relating to these Terms or your use of the Platform, the parties shall first attempt to resolve the matter amicably through good-faith negotiations for a period of thirty (30) days from the date one party notifies the other in writing of the dispute.
            </p>
            <p style={{
              fontFamily: "'Cal Sans', sans-serif",
              fontSize: '16px',
              fontWeight: 400,
              color: '#333333',
              lineHeight: 1.8,
              marginBottom: '16px',
            }}>
              <strong style={{ fontWeight: 600 }}>(b) Arbitration:</strong> If the dispute is not resolved within the 30-day period, it shall be referred to and finally resolved by arbitration in accordance with the Arbitration and Conciliation Act, 1996 (as amended). The arbitration shall be conducted by a sole arbitrator mutually appointed by the parties, or if no agreement is reached within 15 days, appointed by the High Court of Judicature at Hyderabad. The seat and venue of arbitration shall be Hyderabad, Telangana. The proceedings shall be conducted in English.
            </p>
            <p style={{
              fontFamily: "'Cal Sans', sans-serif",
              fontSize: '16px',
              fontWeight: 400,
              color: '#333333',
              lineHeight: 1.8,
            }}>
              <strong style={{ fontWeight: 600 }}>(c) Class Action Waiver:</strong> You agree to bring any claims against Nilay 360 in your individual capacity only, and not as a plaintiff or class member in any purported class action.
            </p>
          </div>

          {/* Section 8 */}
          <div style={{ marginBottom: '48px' }}>
            <p style={{
              fontFamily: "'Cal Sans', sans-serif",
              fontSize: '12px',
              fontWeight: 600,
              color: '#10C4C3',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}>08</p>
            <h2 style={{
              fontFamily: "'Cal Sans', serif",
              fontSize: '36px',
              fontWeight: 600,
              color: '#020C1C',
              borderBottom: '2px solid #10C4C3',
              paddingBottom: '12px',
              marginBottom: '20px',
              lineHeight: 1.2,
            }}>
              Governing Law
            </h2>
            <p style={{
              fontFamily: "'Cal Sans', sans-serif",
              fontSize: '16px',
              fontWeight: 400,
              color: '#333333',
              lineHeight: 1.8,
            }}>
              These Terms shall be governed by and construed in accordance with the laws of India. Subject to the arbitration provisions in Section 7, the courts of competent jurisdiction at Hyderabad, Telangana shall have exclusive jurisdiction over any matters not subject to arbitration.
            </p>
          </div>

          {/* Section 9 */}
          <div style={{ marginBottom: '48px' }}>
            <p style={{
              fontFamily: "'Cal Sans', sans-serif",
              fontSize: '12px',
              fontWeight: 600,
              color: '#10C4C3',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}>09</p>
            <h2 style={{
              fontFamily: "'Cal Sans', serif",
              fontSize: '36px',
              fontWeight: 600,
              color: '#020C1C',
              borderBottom: '2px solid #10C4C3',
              paddingBottom: '12px',
              marginBottom: '20px',
              lineHeight: 1.2,
            }}>
              Changes to Terms
            </h2>
            <p style={{
              fontFamily: "'Cal Sans', sans-serif",
              fontSize: '16px',
              fontWeight: 400,
              color: '#333333',
              lineHeight: 1.8,
            }}>
              Nilay 360 reserves the right to modify these Terms at any time. For material changes, we will provide at least 30 days&rsquo; prior notice via email to your registered address and a prominent notification on the Platform. Your continued use of the Platform after the effective date of revised Terms constitutes your acceptance of those changes. If you do not agree to the revised Terms, you must deactivate your account and cease using the Platform.
            </p>
          </div>

          {/* Section 10 */}
          <div style={{ marginBottom: '0' }}>
            <p style={{
              fontFamily: "'Cal Sans', sans-serif",
              fontSize: '12px',
              fontWeight: 600,
              color: '#10C4C3',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}>10</p>
            <h2 style={{
              fontFamily: "'Cal Sans', serif",
              fontSize: '36px',
              fontWeight: 600,
              color: '#020C1C',
              borderBottom: '2px solid #10C4C3',
              paddingBottom: '12px',
              marginBottom: '20px',
              lineHeight: 1.2,
            }}>
              Contact
            </h2>
            <p style={{
              fontFamily: "'Cal Sans', sans-serif",
              fontSize: '16px',
              fontWeight: 400,
              color: '#333333',
              lineHeight: 1.8,
              marginBottom: '20px',
            }}>
              For legal notices, questions about these Terms, or to report violations, please contact:
            </p>
            <div style={{
              background: '#020C1C',
              border: '1px solid rgba(201,168,76,0.2)',
              borderLeft: '3px solid #10C4C3',
              padding: '24px 28px',
              borderRadius: '2px',
            }}>
              <p style={{
                fontFamily: "'Cal Sans', sans-serif",
                fontSize: '15px',
                fontWeight: 500,
                color: '#020C1C',
                lineHeight: 1.8,
                marginBottom: '4px',
              }}>
                Legal Team, Nilay 360 Real Estate Technologies Private Limited
              </p>
              <p style={{
                fontFamily: "'Cal Sans', sans-serif",
                fontSize: '15px',
                fontWeight: 400,
                color: '#555555',
                lineHeight: 1.8,
                marginBottom: '4px',
              }}>
                Email: <a href="mailto:contact@nilay360.com" style={{ color: '#10C4C3', textDecoration: 'none' }}>contact@nilay360.com</a>
              </p>
              {/* TEMPORARY: Using Hustle Hive office address (owner-confirmed, same location as an existing commercial listing), revert to Nilay360's own registered address once available */}
              <p style={{
                fontFamily: "'Cal Sans', sans-serif",
                fontSize: '15px',
                fontWeight: 400,
                color: '#555555',
                lineHeight: 1.8,
              }}>
                Address: 4th Floor, Trendz Techpark, Road No. 11, Kakatiya Hills, Guttala Begumpet, Kavuri Hills, Madhapur, Hyderabad, Telangana 500081
              </p>
              <p style={{
                fontFamily: "'Cal Sans', sans-serif",
                fontSize: '13px',
                fontWeight: 400,
                color: '#888888',
                lineHeight: 1.8,
                marginTop: '12px',
                fontStyle: 'italic',
              }}>
                Legal notices must be sent by registered post or courier with acknowledgement due.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        background: '#05080C',
        padding: '72px 48px 0',
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
        }}>
          {/* Top: Logo + tagline */}
          <div style={{
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            paddingBottom: '48px',
            marginBottom: '48px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '32px',
          }}>
            <div>
              <p style={{
                fontFamily: "'Cal Sans', serif",
                fontSize: '28px',
                fontWeight: 600,
                color: '#10C4C3',
                letterSpacing: '2px',
                marginBottom: '12px',
              }}>
                Nilay 360 ·
              </p>
              <p style={{
                fontFamily: "'Cal Sans', sans-serif",
                fontSize: '14px',
                fontWeight: 300,
                color: 'rgba(255,255,255,0.45)',
                maxWidth: '280px',
                lineHeight: 1.7,
              }}>
                India&rsquo;s premium real estate discovery platform. Curated properties, verified listings, exceptional service.
              </p>
            </div>

            {/* 4 columns */}
            <div style={{
              display: 'flex',
              gap: '64px',
              flexWrap: 'wrap',
            }}>
              {/* Properties */}
              <div>
                <h4 style={{
                  fontFamily: "'Cal Sans', serif",
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#10C4C3',
                  marginBottom: '20px',
                  letterSpacing: '0.5px',
                }}>
                  Properties
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { label: 'Buy', href: '/buy' },
                    { label: 'Rent', href: '/rent' },
                    { label: 'New Projects', href: '/new-projects' },
                    { label: 'Builders', href: '/builders' },
                  ].map((link) => (
                    <a key={link.href} href={link.href} style={{
                      fontFamily: "'Cal Sans', sans-serif",
                      fontSize: '13px',
                      fontWeight: 400,
                      color: 'rgba(255,255,255,0.5)',
                      textDecoration: 'none',
                    }}>
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>

              {/* Company */}
              <div>
                <h4 style={{
                  fontFamily: "'Cal Sans', serif",
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#10C4C3',
                  marginBottom: '20px',
                  letterSpacing: '0.5px',
                }}>
                  Company
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { label: 'About Us', href: '/about' },
                    { label: 'Our Agents', href: '/agents' },
                    { label: 'NRI Services', href: '/nri' },
                    { label: 'Contact', href: '/contact' },
                  ].map((link) => (
                    <a key={link.href} href={link.href} style={{
                      fontFamily: "'Cal Sans', sans-serif",
                      fontSize: '13px',
                      fontWeight: 400,
                      color: 'rgba(255,255,255,0.5)',
                      textDecoration: 'none',
                    }}>
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>

              {/* Tools */}
              <div>
                <h4 style={{
                  fontFamily: "'Cal Sans', serif",
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#10C4C3',
                  marginBottom: '20px',
                  letterSpacing: '0.5px',
                }}>
                  Tools
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { label: 'EMI Calculator', href: '/calculator' },
                    { label: 'Compare', href: '/compare' },
                    { label: 'Search', href: '/search' },
                    { label: 'RERA Guide', href: '/legal-guide' },
                  ].map((link) => (
                    <a key={link.href} href={link.href} style={{
                      fontFamily: "'Cal Sans', sans-serif",
                      fontSize: '13px',
                      fontWeight: 400,
                      color: 'rgba(255,255,255,0.5)',
                      textDecoration: 'none',
                    }}>
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>

              {/* Legal */}
              <div>
                <h4 style={{
                  fontFamily: "'Cal Sans', serif",
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#10C4C3',
                  marginBottom: '20px',
                  letterSpacing: '0.5px',
                }}>
                  Legal
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { label: 'Privacy Policy', href: '/privacy' },
                    { label: 'Terms of Service', href: '/terms' },
                    { label: 'Cookie Policy', href: '/cookies' },
                    { label: 'Legal Guide', href: '/legal-guide' },
                  ].map((link) => (
                    <a key={link.href} href={link.href} style={{
                      fontFamily: "'Cal Sans', sans-serif",
                      fontSize: '13px',
                      fontWeight: 400,
                      color: 'rgba(255,255,255,0.5)',
                      textDecoration: 'none',
                    }}>
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{
            paddingBottom: '32px',
            textAlign: 'center',
          }}>
            <p style={{
              fontFamily: "'Cal Sans', sans-serif",
              fontSize: '12px',
              fontWeight: 300,
              color: 'rgba(255,255,255,0.3)',
              letterSpacing: '0.3px',
              lineHeight: 1.6,
            }}>
              &copy; 2025 Nilay 360 Real Estate Technologies Pvt. Ltd. &middot; CIN: U70100TG2024PTC123456 &middot; All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
