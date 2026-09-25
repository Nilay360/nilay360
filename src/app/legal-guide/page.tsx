"use client";
import { useState } from "react";

export default function LegalGuidePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      question: "Is RERA registration mandatory for all properties?",
      answer:
        "RERA registration is mandatory for residential and commercial projects where the total land area exceeds 500 square metres or the number of apartments exceeds 8. Individual house plots, independent houses, and projects that received a completion certificate before RERA's enactment in 2017 are generally exempt. However, even for exempt properties, you should conduct full title and encumbrance checks.",
    },
    {
      question: "What should I do if a developer misses the possession date?",
      answer:
        "Under RERA, you have two options: (1) Continue with the project and claim interest on all amounts paid at SBI MCLR + 2% for every month of delay — this interest must be paid monthly by the developer; or (2) Withdraw from the project and claim a full refund of all amounts paid along with the same interest rate from the date of payment. File a complaint on your state RERA portal if the developer does not comply within 45 days of your written notice.",
    },
    {
      question: "How can I verify if an agent is RERA registered?",
      answer:
        "Visit your state's official RERA portal and navigate to the \"Agent Search\" or \"Registered Agents\" section. Search by the agent's name, firm name, or their RERA registration number. A valid registration will show the agent's details, registration expiry date, and any complaints filed against them. Alternatively, ask the agent to show you their original RERA certificate. Never make payments through an unregistered agent.",
    },
    {
      question: "What is the maximum advance payment a developer can demand?",
      answer:
        "Under RERA, a developer cannot accept more than 10% of the total sale price as advance or application money before executing a registered sale agreement (Agreement for Sale). The sale agreement must be registered with the Sub-Registrar's office. Any amount above 10% before a registered agreement is a violation of RERA.",
    },
    {
      question: "Can NRIs purchase residential property in India?",
      answer:
        "Yes, Non-Resident Indians (NRIs) and Persons of Indian Origin (PIOs) can purchase residential and commercial properties in India under the Foreign Exchange Management Act (FEMA), 1999. NRIs do not require RBI permission for such purchases. However, agricultural land, plantation property, and farmhouse cannot be purchased by NRIs without RBI approval. All funds for purchase must be remitted through proper banking channels. Nilay 360 has dedicated NRI Services to assist — visit nilay360.com/nri.",
    },
  ];

  const rightsCards = [
    {
      title: "Right to Information",
      body: "You are entitled to all project information — approved plans, layout, specifications, schedule of possession, and the names of contractors. Developers must make all approvals publicly available on the RERA portal.",
    },
    {
      title: "Right to Stage Payments",
      body: "Payments must be linked to construction milestones, not arbitrary developer demands. No developer can demand more than 10% as advance without a registered sale agreement.",
    },
    {
      title: "Right to Possession on Time",
      body: "The developer must hand over possession by the date stated in the sale agreement, registered with RERA. Any extension requires the buyer's written consent.",
    },
    {
      title: "Right to Refund on Delay",
      body: "If the developer fails to deliver possession by the agreed date and you choose to exit, you are entitled to a full refund of all amounts paid along with interest at the SBI MCLR + 2% per annum.",
    },
    {
      title: "Right to Register a Complaint",
      body: "You can file a complaint directly on the state RERA portal against a developer or agent. Complaints must be resolved within 60 days of registration.",
    },
    {
      title: "Right to Common Area Maintenance",
      body: "After formation of the Residents Welfare Association (RWA), the developer must hand over maintenance of common areas, infrastructure, and facilities as per the agreed specifications.",
    },
  ];

  const steps = [
    {
      title: "Search on State RERA Portal",
      description:
        "Visit your state's official RERA portal and search for the project by name or RERA registration number. The platform may display a RERA number, but always verify it directly on the official government portal.",
    },
    {
      title: "Check Registration Status",
      description:
        'Verify that the registration is "Active" and not "Lapsed" or "Revoked." Check the registration expiry date — it should cover your expected possession date. Review the approved building plans and layout.',
    },
    {
      title: "Verify the Agent's Registration",
      description:
        "All real estate agents are required to register with RERA. Ask your agent for their RERA registration number and verify it on the state portal. Never deal with an unregistered agent.",
    },
    {
      title: "Check Project Status & Milestones",
      description:
        "Review the quarterly progress reports submitted by the developer. Check if construction is progressing as declared, percentage of units sold, and any complaints filed against the project or developer.",
    },
    {
      title: "Check Encumbrances & Title",
      description:
        "Obtain an Encumbrance Certificate (EC) from the Sub-Registrar's office for the past 30 years. Engage a qualified property lawyer for a title search. Verify land ownership documents, conversion orders, and local authority approvals.",
    },
  ];

  const redFlags = [
    {
      title: "No RERA Registration Number",
      body: "Any residential project above 500 sq.m. or 8 units that cannot provide a valid RERA registration number is operating illegally. This is a criminal offence under RERA.",
    },
    {
      title: "Price Significantly Below Market",
      body: "A price that is 20–30% below comparable properties in the area is a major red flag — it may indicate distress, title disputes, illegal construction, or fraud.",
    },
    {
      title: "Unregistered or Evasive Agent",
      body: "An agent who refuses to provide their RERA registration number, or whose registration cannot be verified on the state portal, may not be legitimate.",
    },
    {
      title: "Unclear Title Documents",
      body: "If the developer or seller cannot produce clear title documents — mother deed chain, encumbrance certificate, mutation records — walk away immediately.",
    },
    {
      title: "Demand for Cash Payments",
      body: "Requests for cash payments or unofficial \"black money\" components are illegal under the Prevention of Money Laundering Act and can have serious legal and tax consequences for the buyer.",
    },
    {
      title: "No Approved Building Plan",
      body: "Verify that the building plan is approved by the local authority (GHMC/BDA/BBMP/MCGM). Unapproved constructions risk demolition orders.",
    },
    {
      title: "Pressure to Sign Immediately",
      body: "Legitimate developers never pressure buyers to sign agreements within hours. High-pressure sales tactics often mask problems with the project.",
    },
    {
      title: "Vague Possession Date",
      body: "Any sale agreement that does not specify a clear, legally binding possession date with RERA-compliant penalty clauses is a significant risk.",
    },
  ];

  const glossaryRows = [
    {
      term: "Encumbrance Certificate (EC)",
      definition:
        "A document issued by the Sub-Registrar's office certifying that a property is free from any registered monetary or legal liabilities over a specified period. Essential for establishing clear title.",
    },
    {
      term: "Sale Deed",
      definition:
        "The primary legal document that transfers ownership of a property from seller to buyer. Must be registered at the Sub-Registrar's office and stamp duty paid. The title is not transferred until registration.",
    },
    {
      term: "Khata Certificate",
      definition:
        "A document issued by the local municipal body (e.g., GHMC in Hyderabad, BBMP in Bengaluru) that records the owner's name in municipal records and is required for property tax payment and utility connections.",
    },
    {
      term: "Occupancy Certificate (OC)",
      definition:
        "Issued by the local authority after inspecting a completed building to confirm it was constructed per approved plans and is safe for occupation. Never take possession of a flat without a valid OC.",
    },
    {
      term: "Completion Certificate (CC)",
      definition:
        "Issued by the local authority when all construction is complete and complies with sanctioned plans. Some states issue a combined OC/CC.",
    },
    {
      term: "Title Search Report",
      definition:
        "A legal opinion prepared by an advocate examining the chain of ownership documents for a property over 30 years, to confirm clear and marketable title free from encumbrances.",
    },
    {
      term: "RERA Registration Number",
      definition:
        "A unique identifier assigned to a real estate project upon registration with the state RERA authority. Required to be displayed in all advertisements, brochures, and agreements.",
    },
    {
      term: "Carpet Area",
      definition:
        "The net usable floor area within the walls of an apartment, as defined under RERA. Excludes walls, balconies, and common areas. Sale agreements must be on carpet area basis.",
    },
    {
      term: "Undivided Share (UDS)",
      definition:
        "The proportional share of the land that a flat owner holds in common with other owners in a multi-storey building. The UDS should be clearly mentioned in the sale deed.",
    },
    {
      term: "Tripartite Agreement",
      definition:
        "An agreement between the developer, buyer, and bank/financial institution, executed when the buyer takes a home loan. Ensures the lender's security interest in the property.",
    },
  ];

  const statePortals = [
    { state: "Telangana (TSRERA)", url: "tsrera.telangana.gov.in" },
    { state: "Maharashtra (MahaRERA)", url: "maharera.mahaonline.gov.in" },
    { state: "Karnataka (K-RERA)", url: "rera.karnataka.gov.in" },
    { state: "Delhi (DDREAR)", url: "rera.delhi.gov.in" },
  ];

  const keyFacts = [
    { label: "Enacted", value: "May 2016, Effective: May 1, 2017" },
    { label: "Coverage", value: "36 States & Union Territories" },
    {
      label: "Projects covered",
      value: "Residential & commercial projects above 500 sq.m. or 8+ units",
    },
    {
      label: "Escrow requirement",
      value: "70% of funds in ring-fenced account",
    },
    {
      label: "Penalty for non-compliance",
      value: "Up to 10% of project cost",
    },
    { label: "Grievance", value: "Must be resolved within 60 days" },
    {
      label: "Agent registration",
      value: "Mandatory for all real estate agents",
    },
  ];

  return (
    <div
      style={{
        fontFamily: "var(--font-body-new)",
        margin: 0,
        padding: 0,
        boxSizing: "border-box",
      }}
    >
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; padding: 0; }
        a { text-decoration: none; }
      `}</style>

      {/* NAVBAR */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "68px",
          background: "rgba(5,8,12,0.9)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 40px",
        }}
      >
        <a
          href="/"
          style={{
            fontFamily: "var(--font-support-new)",
            fontSize: "24px",
            color: "#10C4C3",
            fontWeight: 600,
            letterSpacing: "2px",
            textDecoration: "none",
          }}
        >
          Nilay 360 ·
        </a>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "32px",
          }}
        >
          {[
            { label: "Home", href: "/" },
            { label: "Properties", href: "/properties" },
            { label: "New Projects", href: "/new-projects" },
            { label: "Agents", href: "/agents" },
            { label: "Locations", href: "/locations" },
            { label: "Contact", href: "/contact" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              style={{
                fontFamily: "var(--font-body-new)",
                fontSize: "14px",
                color: "rgba(255,255,255,0.75)",
                textDecoration: "none",
                letterSpacing: "0.3px",
              }}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <a
            href="/login"
            style={{
              fontFamily: "var(--font-body-new)",
              fontSize: "14px",
              color: "#10C4C3",
              border: "1px solid #10C4C3",
              padding: "8px 20px",
              borderRadius: "2px",
              textDecoration: "none",
              background: "transparent",
            }}
          >
            Sign In
          </a>
          <a
            href="/post-property"
            style={{
              fontFamily: "var(--font-body-new)",
              fontSize: "14px",
              color: "#05080C",
              background: "#10C4C3",
              padding: "8px 20px",
              borderRadius: "2px",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            List Property
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section
        style={{
          background: "#020C1C",
          paddingTop: "140px",
          paddingBottom: "72px",
          textAlign: "center",
          padding: "140px 24px 72px",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-support-new)",
            fontSize: "12px",
            color: "#10C4C3",
            letterSpacing: "4px",
            textTransform: "uppercase",
            marginBottom: "20px",
          }}
        >
          BUYER PROTECTION
        </p>
        <h1
          style={{
            fontFamily: "var(--font-heading-new)",
            fontSize: "64px",
            color: "#ffffff",
            fontWeight: 600,
            maxWidth: "700px",
            margin: "0 auto",
            lineHeight: 1.1,
          }}
        >
          RERA & Legal Guide for Property Buyers
        </h1>
        <p
          style={{
            fontFamily: "var(--font-body-new)",
            fontSize: "18px",
            color: "rgba(255,255,255,0.6)",
            marginTop: "16px",
          }}
        >
          Everything you need to know to buy property safely in India
        </p>
      </section>

      {/* SECTION 1 — WHAT IS RERA */}
      <section
        style={{
          background: "#ffffff",
          padding: "72px 24px",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "60px",
            alignItems: "start",
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: "var(--font-heading-new)",
                fontSize: "44px",
                color: "#020C1C",
                fontWeight: 600,
                marginBottom: "24px",
                lineHeight: 1.2,
              }}
            >
              What Is RERA?
            </h2>
            <p
              style={{
                fontFamily: "var(--font-body-new)",
                fontSize: "16px",
                color: "#555555",
                lineHeight: 1.8,
              }}
            >
              The Real Estate (Regulation and Development) Act, 2016 (RERA) is a
              landmark legislation enacted by the Parliament of India to protect
              the interests of home buyers and bring accountability and
              transparency to the real estate sector. Before RERA, Indian real
              estate was largely unregulated — developers could delay projects
              for years, divert funds, and make false promises with minimal
              accountability. RERA fundamentally changed this by requiring
              mandatory registration of projects and agents, creating a dispute
              resolution mechanism, and ensuring financial discipline through
              escrow requirements. RERA is administered at the state level —
              each state has its own RERA Authority and portal. As a buyer,
              understanding RERA is your most powerful tool for safe property
              purchase.
            </p>
          </div>

          <div
            style={{
              background: "#020C1C",
              padding: "32px",
              borderRadius: "2px",
            }}
          >
            <h3
              style={{
                fontFamily: "var(--font-heading-new)",
                fontSize: "26px",
                color: "#FFFFFF",
                fontWeight: 600,
                marginBottom: "20px",
              }}
            >
              Key Facts
            </h3>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {keyFacts.map((fact, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    padding: "12px 0",
                    borderBottom:
                      i < keyFacts.length - 1
                        ? "1px solid rgba(13,43,31,0.1)"
                        : "none",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-support-new)",
                      fontSize: "12px",
                      color: "#10C4C3",
                      fontWeight: 600,
                      letterSpacing: "1px",
                      textTransform: "uppercase",
                      marginBottom: "4px",
                    }}
                  >
                    {fact.label}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-body-new)",
                      fontSize: "15px",
                      color: "#A9B4C2",
                    }}
                  >
                    {fact.value}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* SECTION 2 — YOUR RIGHTS */}
      <section
        style={{
          background: "#020C1C",
          padding: "72px 24px",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <h2
            style={{
              fontFamily: "var(--font-heading-new)",
              fontSize: "48px",
              color: "#FFFFFF",
              fontWeight: 600,
              textAlign: "center",
              marginBottom: "12px",
            }}
          >
            Your Rights as a Buyer
          </h2>
          <p
            style={{
              fontFamily: "var(--font-body-new)",
              fontSize: "16px",
              color: "#A9B4C2",
              textAlign: "center",
              marginBottom: "48px",
            }}
          >
            RERA guarantees these fundamental protections
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "24px",
            }}
          >
            {rightsCards.map((card, i) => (
              <div
                key={i}
                style={{
                  background: "#ffffff",
                  padding: "32px",
                  borderRadius: "2px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                  borderTop: "3px solid #10C4C3",
                }}
              >
                <h3
                  style={{
                    fontFamily: "var(--font-heading-new)",
                    fontSize: "22px",
                    color: "#020C1C",
                    fontWeight: 600,
                    marginBottom: "12px",
                    lineHeight: 1.3,
                  }}
                >
                  {card.title}
                </h3>
                <p
                  style={{
                    fontFamily: "var(--font-body-new)",
                    fontSize: "15px",
                    color: "#555555",
                    lineHeight: 1.7,
                  }}
                >
                  {card.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3 — HOW TO VERIFY */}
      <section
        style={{
          background: "#ffffff",
          padding: "72px 24px",
        }}
      >
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <h2
            style={{
              fontFamily: "var(--font-heading-new)",
              fontSize: "48px",
              color: "#020C1C",
              fontWeight: 600,
              textAlign: "center",
              marginBottom: "12px",
            }}
          >
            How to Verify a Project
          </h2>
          <p
            style={{
              fontFamily: "var(--font-body-new)",
              fontSize: "16px",
              color: "#666666",
              textAlign: "center",
              marginBottom: "56px",
            }}
          >
            Follow these steps before making any payment
          </p>

          <div style={{ position: "relative" }}>
            {steps.map((step, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "24px",
                  marginBottom: i < steps.length - 1 ? "0" : "0",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      background: "#10C4C3",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--font-support-new)",
                      fontSize: "22px",
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      style={{
                        width: "2px",
                        flex: 1,
                        borderLeft: "2px dashed rgba(201,168,76,0.5)",
                        minHeight: "48px",
                      }}
                    />
                  )}
                </div>

                <div
                  style={{
                    paddingBottom: i < steps.length - 1 ? "40px" : "0",
                    paddingTop: "8px",
                  }}
                >
                  <h3
                    style={{
                      fontFamily: "var(--font-heading-new)",
                      fontSize: "22px",
                      color: "#020C1C",
                      fontWeight: 600,
                      marginBottom: "8px",
                    }}
                  >
                    {step.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: "var(--font-body-new)",
                      fontSize: "15px",
                      color: "#555555",
                      lineHeight: 1.7,
                    }}
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* State RERA Portals */}
          <div
            style={{
              background: "#020C1C",
              padding: "32px",
              borderRadius: "2px",
              marginTop: "48px",
            }}
          >
            <h3
              style={{
                fontFamily: "var(--font-heading-new)",
                fontSize: "28px",
                color: "#10C4C3",
                fontWeight: 600,
                marginBottom: "24px",
              }}
            >
              Official State RERA Portals
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "12px",
              }}
            >
              {statePortals.map((portal, i) => (
                <a
                  key={i}
                  href={`https://${portal.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(201,168,76,0.3)",
                    color: "#ffffff",
                    padding: "16px",
                    borderRadius: "2px",
                    textDecoration: "none",
                    display: "block",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-body-new)",
                      fontSize: "14px",
                      color: "#10C4C3",
                      fontWeight: 600,
                      marginBottom: "4px",
                    }}
                  >
                    {portal.state}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-body-new)",
                      fontSize: "13px",
                      color: "rgba(255,255,255,0.6)",
                    }}
                  >
                    {portal.url}
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 — RED FLAGS */}
      <section
        style={{
          background: "#020C1C",
          padding: "72px 24px",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <h2
            style={{
              fontFamily: "var(--font-heading-new)",
              fontSize: "48px",
              color: "#FFFFFF",
              fontWeight: 600,
              textAlign: "center",
              marginBottom: "12px",
            }}
          >
            Red Flags to Watch For
          </h2>
          <p
            style={{
              fontFamily: "var(--font-body-new)",
              fontSize: "16px",
              color: "#A9B4C2",
              textAlign: "center",
              marginBottom: "48px",
            }}
          >
            Walk away if you notice any of these warning signs
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "20px",
            }}
          >
            {redFlags.map((flag, i) => (
              <div
                key={i}
                style={{
                  background: "#ffffff",
                  padding: "24px",
                  borderRadius: "2px",
                  borderLeft: "4px solid #DC2626",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                }}
              >
                <h3
                  style={{
                    fontFamily: "var(--font-heading-new)",
                    fontSize: "19px",
                    color: "#020C1C",
                    fontWeight: 600,
                    marginBottom: "10px",
                    lineHeight: 1.3,
                  }}
                >
                  {flag.title}
                </h3>
                <p
                  style={{
                    fontFamily: "var(--font-body-new)",
                    fontSize: "14px",
                    color: "#555555",
                    lineHeight: 1.7,
                  }}
                >
                  {flag.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5 — GLOSSARY */}
      <section
        style={{
          background: "#ffffff",
          padding: "72px 24px",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <h2
            style={{
              fontFamily: "var(--font-heading-new)",
              fontSize: "48px",
              color: "#020C1C",
              fontWeight: 600,
              textAlign: "center",
              marginBottom: "48px",
            }}
          >
            Property Glossary
          </h2>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                maxWidth: "820px",
                margin: "0 auto",
                borderCollapse: "collapse",
                display: "table",
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      background: "#020C1C",
                      color: "#ffffff",
                      fontFamily: "var(--font-body-new)",
                      fontSize: "14px",
                      fontWeight: 500,
                      padding: "16px 20px",
                      textAlign: "left",
                      border: "1px solid #E8E3D9",
                    }}
                  >
                    Term
                  </th>
                  <th
                    style={{
                      background: "#020C1C",
                      color: "#ffffff",
                      fontFamily: "var(--font-body-new)",
                      fontSize: "14px",
                      fontWeight: 500,
                      padding: "16px 20px",
                      textAlign: "left",
                      border: "1px solid #E8E3D9",
                    }}
                  >
                    Definition
                  </th>
                </tr>
              </thead>
              <tbody>
                {glossaryRows.map((row, i) => (
                  <tr
                    key={i}
                    style={{
                      background: i % 2 === 0 ? "#ffffff" : "#020C1C",
                    }}
                  >
                    <td
                      style={{
                        padding: "16px 20px",
                        border: "1px solid #E8E3D9",
                        fontFamily: "var(--font-body-new)",
                        fontSize: "15px",
                        color: i % 2 === 0 ? "#020C1C" : "#FFFFFF",
                        fontWeight: 500,
                        verticalAlign: "top",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.term}
                    </td>
                    <td
                      style={{
                        padding: "16px 20px",
                        border: "1px solid #E8E3D9",
                        fontFamily: "var(--font-body-new)",
                        fontSize: "15px",
                        color: i % 2 === 0 ? "#555555" : "#A9B4C2",
                        lineHeight: 1.7,
                        verticalAlign: "top",
                      }}
                    >
                      {row.definition}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 6 — FAQ */}
      <section
        style={{
          background: "#020C1C",
          padding: "72px 24px",
        }}
      >
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <h2
            style={{
              fontFamily: "var(--font-heading-new)",
              fontSize: "48px",
              color: "#FFFFFF",
              fontWeight: 600,
              textAlign: "center",
              marginBottom: "48px",
            }}
          >
            Frequently Asked Questions
          </h2>

          <div>
            {faqs.map((faq, i) => (
              <div
                key={i}
                style={{
                  background: "#ffffff",
                  padding: "20px 24px",
                  marginBottom: "8px",
                  borderRadius: "2px",
                  cursor: "pointer",
                }}
                onClick={() => toggleFaq(i)}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "16px",
                  }}
                >
                  <h3
                    style={{
                      fontFamily: "var(--font-heading-new)",
                      fontSize: "20px",
                      color: "#020C1C",
                      fontWeight: 600,
                      lineHeight: 1.3,
                    }}
                  >
                    {faq.question}
                  </h3>
                  <span
                    style={{
                      fontFamily: "var(--font-body-new)",
                      fontSize: "22px",
                      color: "#10C4C3",
                      flexShrink: 0,
                      lineHeight: 1,
                      userSelect: "none",
                    }}
                  >
                    {openFaq === i ? "−" : "+"}
                  </span>
                </div>
                {openFaq === i && (
                  <p
                    style={{
                      fontFamily: "var(--font-body-new)",
                      fontSize: "15px",
                      color: "#555555",
                      lineHeight: 1.8,
                      marginTop: "16px",
                      paddingTop: "16px",
                      borderTop: "1px solid #E8E3D9",
                    }}
                  >
                    {faq.answer}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 7 — CTA */}
      <section
        style={{
          background: "#020C1C",
          padding: "72px 24px",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-heading-new)",
            fontSize: "48px",
            color: "#ffffff",
            fontWeight: 600,
            marginBottom: "0",
          }}
        >
          Need Help with Your Property Purchase?
        </h2>
        <p
          style={{
            fontFamily: "var(--font-body-new)",
            fontSize: "18px",
            color: "rgba(255,255,255,0.7)",
            maxWidth: "600px",
            margin: "16px auto 0",
            lineHeight: 1.7,
          }}
        >
          Our team of legal experts can guide you through
          every step — from RERA verification to registration.
        </p>
        <a
          href="/contact"
          style={{
            display: "inline-block",
            background: "#10C4C3",
            color: "#05080C",
            padding: "16px 40px",
            fontFamily: "var(--font-body-new)",
            fontSize: "15px",
            fontWeight: 600,
            letterSpacing: "1px",
            textDecoration: "none",
            borderRadius: "2px",
            marginTop: "32px",
          }}
        >
          Get Free Legal Consultation
        </a>
        <p
          style={{
            fontFamily: "var(--font-body-new)",
            fontSize: "13px",
            color: "rgba(255,255,255,0.5)",
            marginTop: "16px",
          }}
        >
          No charges. Talk to a RERA expert within 24 hours.
        </p>
      </section>

    </div>
  );
}
