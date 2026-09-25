/* ═══════════════════════════════════════════════════════════════
 * DRAFT — PENDING LEGAL REVIEW, NOT FINAL.
 * This page's content is a structural draft only. It has NOT been
 * reviewed by a lawyer and must not be treated as a binding policy
 * until it has. Section 05 (Grievance Officer name/email) is an
 * explicit placeholder pending confirmation. Section 03's SLA
 * timeline mirrors the statutory minimums under Rule 4 of the
 * Consumer Protection (E-Commerce) Rules, 2020 as a reference
 * point — whether those specific Rules bind a real-estate
 * marketplace (vs. a goods/services e-commerce platform) needs a
 * lawyer's confirmation, which is why Section 01 describes this as
 * "informed by" rather than "in accordance with" those Rules. See
 * conversation history for full drafting context.
 * ═══════════════════════════════════════════════════════════════ */

export default function GrievanceRedressalPage() {
  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: var(--font-body-new); }
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
          fontFamily: "var(--font-support-new)",
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
              fontFamily: "var(--font-body-new)",
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
            fontFamily: "var(--font-body-new)",
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
            fontFamily: "var(--font-body-new)",
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
          fontFamily: "var(--font-support-new)",
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
          fontFamily: "var(--font-heading-new)",
          fontSize: '64px',
          fontWeight: 600,
          color: '#FFFFFF',
          lineHeight: 1.1,
          marginBottom: '20px',
          letterSpacing: '-0.5px',
        }}>
          Grievance Redressal Policy
        </h1>
        <p style={{
          fontFamily: "var(--font-body-new)",
          fontSize: '16px',
          fontWeight: 300,
          color: 'rgba(255,255,255,0.6)',
          letterSpacing: '0.2px',
        }}>
          Last updated: [DATE — TBD]
        </p>
      </section>

      {/* DRAFT BANNER — visible on the live page, not just a source comment. */}
      <div style={{
        background: '#FFF3CD',
        borderTop: '1px solid #F0C36D',
        borderBottom: '1px solid #F0C36D',
        padding: '16px 24px',
        textAlign: 'center',
      }}>
        <p style={{
          fontFamily: "var(--font-body-new)",
          fontSize: '14px',
          fontWeight: 600,
          color: '#7A5C00',
          maxWidth: '820px',
          margin: '0 auto',
          lineHeight: 1.6,
        }}>
          ⚠ DRAFT — PENDING LEGAL REVIEW. This page has not yet been reviewed by legal counsel and does not reflect a final, binding policy.
        </p>
      </div>

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
              fontFamily: "var(--font-support-new)",
              fontSize: '12px',
              fontWeight: 600,
              color: '#10C4C3',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}>01</p>
            <h2 style={{
              fontFamily: "var(--font-heading-new)",
              fontSize: '36px',
              fontWeight: 600,
              color: '#020C1C',
              borderBottom: '2px solid #10C4C3',
              paddingBottom: '12px',
              marginBottom: '20px',
              lineHeight: 1.2,
            }}>
              Purpose &amp; Scope
            </h2>
            <p style={{
              fontFamily: "var(--font-body-new)",
              fontSize: '16px',
              fontWeight: 400,
              color: '#333333',
              lineHeight: 1.8,
            }}>
              This Grievance Redressal Policy sets out how Nilay 360 receives, acknowledges, and resolves grievances raised by buyers, tenants, sellers, and agents relating to Listings, transactions, or conduct on the Platform. It is informed by applicable Indian consumer protection principles, including the Consumer Protection (E-Commerce) Rules, 2020, and the Information Technology Act, 2000.
            </p>
          </div>

          {/* Section 2 */}
          <div style={{ marginBottom: '48px' }}>
            <p style={{
              fontFamily: "var(--font-support-new)",
              fontSize: '12px',
              fontWeight: 600,
              color: '#10C4C3',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}>02</p>
            <h2 style={{
              fontFamily: "var(--font-heading-new)",
              fontSize: '36px',
              fontWeight: 600,
              color: '#020C1C',
              borderBottom: '2px solid #10C4C3',
              paddingBottom: '12px',
              marginBottom: '20px',
              lineHeight: 1.2,
            }}>
              How to File a Complaint
            </h2>
            <p style={{
              fontFamily: "var(--font-body-new)",
              fontSize: '16px',
              fontWeight: 400,
              color: '#333333',
              lineHeight: 1.8,
            }}>
              A grievance may be raised through: (a) the &ldquo;Report&rdquo; control available on any property listing or agent profile page, which logs the complaint directly to Nilay 360&rsquo;s internal review queue; (b) the{' '}
              <a href="/contact" style={{ color: '#10C4C3', textDecoration: 'none' }}>Contact</a> page; (c) writing directly to the Grievance Officer named in Section 5 below.
            </p>
          </div>

          {/* Section 3 */}
          <div style={{ marginBottom: '48px' }}>
            <p style={{
              fontFamily: "var(--font-support-new)",
              fontSize: '12px',
              fontWeight: 600,
              color: '#10C4C3',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}>03</p>
            <h2 style={{
              fontFamily: "var(--font-heading-new)",
              fontSize: '36px',
              fontWeight: 600,
              color: '#020C1C',
              borderBottom: '2px solid #10C4C3',
              paddingBottom: '12px',
              marginBottom: '20px',
              lineHeight: 1.2,
            }}>
              Acknowledgment &amp; Resolution Timeline
            </h2>
            <p style={{
              fontFamily: "var(--font-body-new)",
              fontSize: '16px',
              fontWeight: 400,
              color: '#333333',
              lineHeight: 1.8,
            }}>
              Grievances will be acknowledged within 48 hours of receipt and, where possible, resolved within 30 days. Complex matters requiring investigation, legal review, or third-party input may take longer; the complainant will be kept informed of status. <em>(These timelines are provisional, pending confirmation.)</em>
            </p>
          </div>

          {/* Section 4 */}
          <div style={{ marginBottom: '48px' }}>
            <p style={{
              fontFamily: "var(--font-support-new)",
              fontSize: '12px',
              fontWeight: 600,
              color: '#10C4C3',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}>04</p>
            <h2 style={{
              fontFamily: "var(--font-heading-new)",
              fontSize: '36px',
              fontWeight: 600,
              color: '#020C1C',
              borderBottom: '2px solid #10C4C3',
              paddingBottom: '12px',
              marginBottom: '20px',
              lineHeight: 1.2,
            }}>
              Escalation Path
            </h2>
            <p style={{
              fontFamily: "var(--font-body-new)",
              fontSize: '16px',
              fontWeight: 400,
              color: '#333333',
              lineHeight: 1.8,
            }}>
              If a grievance is not resolved within the timeline above, or the complainant is unsatisfied with the resolution, it may be escalated in writing to the Grievance Officer directly (Section 5). Grievances that remain unresolved may be referred to the National Consumer Helpline, the appropriate State Consumer Disputes Redressal Commission, or another forum available under Indian consumer protection law.
            </p>
          </div>

          {/* Section 5 */}
          <div style={{ marginBottom: '48px' }}>
            <p style={{
              fontFamily: "var(--font-support-new)",
              fontSize: '12px',
              fontWeight: 600,
              color: '#10C4C3',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}>05</p>
            <h2 style={{
              fontFamily: "var(--font-heading-new)",
              fontSize: '36px',
              fontWeight: 600,
              color: '#020C1C',
              borderBottom: '2px solid #10C4C3',
              paddingBottom: '12px',
              marginBottom: '20px',
              lineHeight: 1.2,
            }}>
              Grievance Officer
            </h2>
            <div style={{
              background: '#020C1C',
              border: '1px solid rgba(201,168,76,0.2)',
              borderLeft: '3px solid #10C4C3',
              padding: '24px 28px',
              borderRadius: '2px',
            }}>
              <p style={{ fontFamily: "var(--font-body-new)", fontSize: '15px', fontWeight: 500, color: '#FFFFFF', lineHeight: 1.8, marginBottom: '4px' }}>
                Name: [TBD]
              </p>
              <p style={{ fontFamily: "var(--font-body-new)", fontSize: '15px', fontWeight: 400, color: '#A9B4C2', lineHeight: 1.8, marginBottom: '4px' }}>
                Designation: Grievance Officer
              </p>
              <p style={{ fontFamily: "var(--font-body-new)", fontSize: '15px', fontWeight: 400, color: '#A9B4C2', lineHeight: 1.8, marginBottom: '4px' }}>
                Email: [TBD — pending confirmation]
              </p>
              <p style={{ fontFamily: "var(--font-body-new)", fontSize: '15px', fontWeight: 400, color: '#A9B4C2', lineHeight: 1.8, marginBottom: '4px' }}>
                Address: 4th Floor, Trendz Techpark, Road No. 11, Kakatiya Hills, Guttala Begumpet, Kavuri Hills, Madhapur, Hyderabad, Telangana 500081
              </p>
              <p style={{ fontFamily: "var(--font-body-new)", fontSize: '15px', fontWeight: 400, color: '#A9B4C2', lineHeight: 1.8 }}>
                Hours: Mon &ndash; Sat &middot; 9 AM &ndash; 7 PM IST
              </p>
            </div>
          </div>

          {/* Section 6 */}
          <div style={{ marginBottom: '48px' }}>
            <p style={{
              fontFamily: "var(--font-support-new)",
              fontSize: '12px',
              fontWeight: 600,
              color: '#10C4C3',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}>06</p>
            <h2 style={{
              fontFamily: "var(--font-heading-new)",
              fontSize: '36px',
              fontWeight: 600,
              color: '#020C1C',
              borderBottom: '2px solid #10C4C3',
              paddingBottom: '12px',
              marginBottom: '20px',
              lineHeight: 1.2,
            }}>
              What This Policy Does Not Cover
            </h2>
            <p style={{
              fontFamily: "var(--font-body-new)",
              fontSize: '16px',
              fontWeight: 400,
              color: '#333333',
              lineHeight: 1.8,
            }}>
              General customer support queries &mdash; property search assistance, technical issues, billing questions &mdash; are not &ldquo;grievances&rdquo; under this policy and should be directed to the{' '}
              <a href="/contact" style={{ color: '#10C4C3', textDecoration: 'none' }}>Contact</a> page for a faster response. This policy is specifically for complaints about conduct, fraud, misrepresentation, or violations of Nilay 360&rsquo;s policies.
            </p>
          </div>

          {/* Section 7 */}
          <div style={{ marginBottom: '0' }}>
            <p style={{
              fontFamily: "var(--font-support-new)",
              fontSize: '12px',
              fontWeight: 600,
              color: '#10C4C3',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}>07</p>
            <h2 style={{
              fontFamily: "var(--font-heading-new)",
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
              fontFamily: "var(--font-body-new)",
              fontSize: '16px',
              fontWeight: 400,
              color: '#333333',
              lineHeight: 1.8,
              marginBottom: '20px',
            }}>
              For legal notices, questions about this policy, or general contact, please write to:
            </p>
            <div style={{
              background: '#020C1C',
              border: '1px solid rgba(201,168,76,0.2)',
              borderLeft: '3px solid #10C4C3',
              padding: '24px 28px',
              borderRadius: '2px',
            }}>
              <p style={{
                fontFamily: "var(--font-body-new)",
                fontSize: '15px',
                fontWeight: 500,
                color: '#FFFFFF',
                lineHeight: 1.8,
                marginBottom: '4px',
              }}>
                Legal Team, Nilay 360 Real Estate Technologies Private Limited
              </p>
              <p style={{
                fontFamily: "var(--font-body-new)",
                fontSize: '15px',
                fontWeight: 400,
                color: '#A9B4C2',
                lineHeight: 1.8,
                marginBottom: '4px',
              }}>
                Email: <a href="mailto:contact@nilay360.com" style={{ color: '#10C4C3', textDecoration: 'none' }}>contact@nilay360.com</a>
              </p>
              <p style={{
                fontFamily: "var(--font-body-new)",
                fontSize: '15px',
                fontWeight: 400,
                color: '#A9B4C2',
                lineHeight: 1.8,
              }}>
                Address: 4th Floor, Trendz Techpark, Road No. 11, Kakatiya Hills, Guttala Begumpet, Kavuri Hills, Madhapur, Hyderabad, Telangana 500081
              </p>
              <p style={{
                fontFamily: "var(--font-body-new)",
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
                fontFamily: "var(--font-support-new)",
                fontSize: '28px',
                fontWeight: 600,
                color: '#10C4C3',
                letterSpacing: '2px',
                marginBottom: '12px',
              }}>
                Nilay 360 ·
              </p>
              <p style={{
                fontFamily: "var(--font-body-new)",
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
                  fontFamily: "var(--font-heading-new)",
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
                      fontFamily: "var(--font-body-new)",
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
                  fontFamily: "var(--font-heading-new)",
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
                      fontFamily: "var(--font-body-new)",
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
                  fontFamily: "var(--font-heading-new)",
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
                    { label: 'Safety Guide', href: '/safety-guide' },
                  ].map((link) => (
                    <a key={link.href} href={link.href} style={{
                      fontFamily: "var(--font-body-new)",
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
                  fontFamily: "var(--font-heading-new)",
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
                    { label: 'Agent Terms', href: '/agent-terms' },
                    { label: 'Grievance Redressal', href: '/grievance-redressal' },
                  ].map((link) => (
                    <a key={link.href} href={link.href} style={{
                      fontFamily: "var(--font-body-new)",
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
              fontFamily: "var(--font-body-new)",
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
