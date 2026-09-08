/* ═══════════════════════════════════════════════════════════════
 * DRAFT — PENDING LEGAL REVIEW, NOT FINAL.
 * This page's content is a structural draft only. It has NOT been
 * reviewed by a lawyer and must not be treated as a binding policy
 * until it has. Section 05 (Commission & Payment Terms) is
 * explicitly undefined pending a business decision — do not add
 * numbers or a fee structure here without that decision being made
 * first. See conversation history for full drafting context.
 * ═══════════════════════════════════════════════════════════════ */

export default function AgentTermsPage() {
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
          Agent Terms of Service
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

      {/* DRAFT BANNER — visible on the live page, not just a source comment.
          These are real legal documents that have not been reviewed by
          counsel yet; this stays until that review is done. */}
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
              Acceptance &amp; Scope
            </h2>
            <p style={{
              fontFamily: "var(--font-body-new)",
              fontSize: '16px',
              fontWeight: 400,
              color: '#333333',
              lineHeight: 1.8,
            }}>
              These Agent Terms of Service apply specifically to any User who registers, applies for, or operates an Agent or Agency account on the Nilay 360 platform, in addition to &mdash; not in place of &mdash; the general{' '}
              <a href="/terms" style={{ color: '#10C4C3', textDecoration: 'none' }}>Terms of Service</a>. Where these Agent Terms conflict with the general Terms, these Agent Terms govern for agent-specific conduct.
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
              Agent Eligibility
            </h2>
            <p style={{
              fontFamily: "var(--font-body-new)",
              fontSize: '16px',
              fontWeight: 400,
              color: '#333333',
              lineHeight: 1.8,
            }}>
              Agent status is not automatic upon registration. An account is recognised as an Agent only once Nilay 360&rsquo;s admin team has reviewed and approved the application. Accounts in a pending or rejected state have no access to agent-only features &mdash; including lead management, listing management on behalf of clients, or the agent dashboard &mdash; until and unless approved.
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
              Listing Representation Obligations
            </h2>
            <p style={{
              fontFamily: "var(--font-body-new)",
              fontSize: '16px',
              fontWeight: 400,
              color: '#333333',
              lineHeight: 1.8,
            }}>
              When creating or managing a Listing on behalf of a client, an Agent represents and warrants that: (a) they are duly authorised by the property owner or title holder to list and negotiate on the property; (b) all information in the Listing &mdash; price, area, location, amenities, and photographs &mdash; is accurate, current, and not misleading; (c) they will promptly update or remove a Listing once it is no longer available, under offer exclusively elsewhere, or the underlying authorisation ends.
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
              RERA Registration Display
            </h2>
            <p style={{
              fontFamily: "var(--font-body-new)",
              fontSize: '16px',
              fontWeight: 400,
              color: '#333333',
              lineHeight: 1.8,
            }}>
              Where an Agent holds a RERA registration applicable under the law of the relevant state, the Agent is solely responsible for the accuracy of that registration number as displayed on their profile or listings. Nilay 360&rsquo;s display of an agent&rsquo;s RERA number does not constitute endorsement or verification of that registration &mdash; Nilay 360 does not independently verify agent RERA registration status.
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
              Commission &amp; Payment Terms &mdash; Not Yet Defined
            </h2>
            <p style={{
              fontFamily: "var(--font-body-new)",
              fontSize: '16px',
              fontWeight: 400,
              color: '#333333',
              lineHeight: 1.8,
            }}>
              Nilay 360&rsquo;s commission structure, fee schedule, and payment terms for Agents are not yet finalised &mdash; this is a pending business decision. Nothing in these Terms establishes, implies, or should be read as committing to any commission percentage, fee amount, or payment obligation. A separate commission agreement or fee schedule will be communicated to Agents before any such terms take effect.
            </p>
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
              Termination &amp; Suspension
            </h2>
            <p style={{
              fontFamily: "var(--font-body-new)",
              fontSize: '16px',
              fontWeight: 400,
              color: '#333333',
              lineHeight: 1.8,
            }}>
              Nilay 360 may, at its discretion, suspend or terminate an Agent&rsquo;s account, revoke approved status, or remove any Listing associated with that Agent &mdash; including for violations of Section 7, provision of false RERA or identity information, or repeated user complaints &mdash; with or without prior notice where warranted by the severity of the conduct.
            </p>
          </div>

          {/* Section 7 */}
          <div style={{ marginBottom: '48px' }}>
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
              Prohibited Conduct
            </h2>
            <p style={{
              fontFamily: "var(--font-body-new)",
              fontSize: '16px',
              fontWeight: 400,
              color: '#333333',
              lineHeight: 1.8,
            }}>
              An Agent must not: (a) engage in self-dealing (representing both a buyer and seller in the same transaction, or acting on their own behalf as a principal) without clear, written disclosure to all parties; (b) circumvent or attempt to circumvent any Nilay 360 fee or commission structure, once such a structure is defined, by directing users off-platform for the purpose of avoiding platform fees; (c) impersonate another agent, agency, or individual, or misrepresent their RERA registration or approval status; (d) use lead or contact information obtained through the Platform for any purpose other than the transaction it relates to.
            </p>
          </div>

          {/* Section 8 */}
          <div style={{ marginBottom: '48px' }}>
            <p style={{
              fontFamily: "var(--font-support-new)",
              fontSize: '12px',
              fontWeight: 600,
              color: '#10C4C3',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}>08</p>
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
              Relationship to General Terms of Service
            </h2>
            <p style={{
              fontFamily: "var(--font-body-new)",
              fontSize: '16px',
              fontWeight: 400,
              color: '#333333',
              lineHeight: 1.8,
            }}>
              These Agent Terms supplement, and do not replace, the general{' '}
              <a href="/terms" style={{ color: '#10C4C3', textDecoration: 'none' }}>Terms of Service</a>. Provisions of the general Terms not specifically addressed here &mdash; including Limitation of Liability, Dispute Resolution, and Governing Law &mdash; apply equally to Agents.
            </p>
          </div>

          {/* Section 9 */}
          <div style={{ marginBottom: '48px' }}>
            <p style={{
              fontFamily: "var(--font-support-new)",
              fontSize: '12px',
              fontWeight: 600,
              color: '#10C4C3',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}>09</p>
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
              Dispute Resolution &amp; Governing Law
            </h2>
            <p style={{
              fontFamily: "var(--font-body-new)",
              fontSize: '16px',
              fontWeight: 400,
              color: '#333333',
              lineHeight: 1.8,
            }}>
              Any dispute arising out of or relating to these Agent Terms shall follow the same good-faith negotiation, arbitration (seated in Hyderabad, Telangana, under the Arbitration and Conciliation Act, 1996), and governing-law provisions set out in Sections 7 and 8 of the general{' '}
              <a href="/terms" style={{ color: '#10C4C3', textDecoration: 'none' }}>Terms of Service</a>, applied here to agent-specific disputes.
            </p>
          </div>

          {/* Section 10 */}
          <div style={{ marginBottom: '0' }}>
            <p style={{
              fontFamily: "var(--font-support-new)",
              fontSize: '12px',
              fontWeight: 600,
              color: '#10C4C3',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}>10</p>
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
              For legal notices, questions about these Agent Terms, or to report violations, please contact:
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
                color: '#020C1C',
                lineHeight: 1.8,
                marginBottom: '4px',
              }}>
                Legal Team, Nilay 360 Real Estate Technologies Private Limited
              </p>
              <p style={{
                fontFamily: "var(--font-body-new)",
                fontSize: '15px',
                fontWeight: 400,
                color: '#555555',
                lineHeight: 1.8,
                marginBottom: '4px',
              }}>
                Email: <a href="mailto:contact@nilay360.com" style={{ color: '#10C4C3', textDecoration: 'none' }}>contact@nilay360.com</a>
              </p>
              <p style={{
                fontFamily: "var(--font-body-new)",
                fontSize: '15px',
                fontWeight: 400,
                color: '#555555',
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
