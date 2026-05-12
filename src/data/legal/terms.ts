export type LegalListStyle = "bullet" | "alpha" | "numeric";

export type LegalClause = {
  id: string;
  number: string;
  paragraphs?: string[];
  list?: string[];
  listStyle?: LegalListStyle;
  address?: string[];
};

export type LegalSection = {
  id: string;
  number: string;
  title: string;
  clauses: LegalClause[];
};

const clause = (
  number: string,
  paragraph: string,
  options: Pick<LegalClause, "list" | "listStyle" | "address"> = {}
): LegalClause => ({
  id: `clause-${number.replace(/\./g, "-")}`,
  number,
  paragraphs: [paragraph],
  ...options
});

export const termsDocument: {
  title: string;
  subtitle: string;
  lastUpdated: string;
  sections: LegalSection[];
} = {
  title: "Ditto Terms of Service",
  subtitle: "The fine print, made simple.",
  lastUpdated: "12 May 2026",
  sections: [
    {
      id: "section-1",
      number: "1",
      title: "Introduction and Binding Effect",
      clauses: [
          clause("1.1", "These Terms of Service (“Terms”) govern access to and use of candidate-facing websites, job application tools, candidate profiles, CV upload tools, saved CV functionality, job widgets, career pages, application forms, related services, integrations, and associated technology made available under the Ditto brand."),
          clause("1.2", "Ditto is operated by Ditto Jobs (Pty) Ltd, registration number 2015/372082/07, a private company duly incorporated in accordance with the laws of the Republic of South Africa (“Ditto”, “we”, “us”, or “our”)."),
          clause("1.3", "These Terms constitute a legally binding agreement between Ditto and any natural person who creates an account, searches for jobs, uploads a CV or other document, creates or updates a candidate profile, applies for a job, uses a job widget, uses a career page powered by Ditto, interacts with an integration partner through Ditto, or otherwise accesses any candidate-facing part of the Services (“Candidate”, “you”, or “your”)."),
          clause("1.4", "By creating an account, clicking to accept these Terms, accessing the Services, uploading information, submitting an application, or otherwise using any part of the candidate-facing Services, you confirm and agree that:", { list: ["you have read and understood these Terms;","you accept these Terms in full;","you agree to be legally bound by these Terms;","you are legally permitted to use the Services in the country or region relevant to your use of the Services; and","you will comply with these Terms when using the Services."], listStyle: "alpha" }),
          clause("1.5", "If you do not agree to these Terms, you must not create an account, upload information, apply for jobs, or use the Services."),
          clause("1.6", "These Terms apply whether the Services are accessed through Ditto’s websites, job widgets, employer or recruiter career pages, application interfaces, profile pages, integrations, APIs, mobile or browser-based interfaces, or any other channel through which Ditto makes candidate-facing functionality available.")
      ]
    },
    {
      id: "section-2",
      number: "2",
      title: "Candidate Eligibility and Legal Working Age",
      clauses: [
          clause("2.1", "The candidate-facing Services are intended for people who are legally permitted to seek work, apply for work, or be considered for employment in the country, state, province, territory, or region relevant to the job opportunity."),
          clause("2.2", "You may use the Services only if you are old enough to enter into these Terms and old enough to lawfully seek or apply for work in the relevant jurisdiction."),
          clause("2.3", "Ditto does not intend the Services to be used by children or by persons who are not legally permitted to seek work. If you are not legally permitted to seek work or apply for work in the relevant jurisdiction, you must not use the Services."),
          clause("2.4", "You are responsible for ensuring that your use of the Services is lawful in your country or region and in relation to any job for which you apply.")
      ]
    },
    {
      id: "section-3",
      number: "3",
      title: "Definitions",
      clauses: [
          clause("3.1", "“Account” means your candidate account within Ditto, including your login credentials, candidate profile, saved CVs, uploaded files, application history, account settings, and associated records."),
          clause("3.2", "“AI Features” means any functionality made available through the Services that uses machine learning, artificial intelligence, natural language processing, statistical inference, predictive scoring, automated ranking, classification models, generative systems, or similar technologies to assist with parsing, structuring, organising, summarising, recommending, matching, ranking, classifying, or analysing information."),
          clause("3.3", "“Application” means a job application, candidate submission, expression of interest, profile submission, response to screening questions, file submission, or other candidate information submitted in relation to a specific job, employer, recruiter, recruitment agency, hiring team, career page, job widget, or opportunity."),
          clause("3.4", "“Candidate Data” means any data relating to you or provided by you, including your name, email address, password credentials, contact details, location, country, city, industry, employment history, education history, qualifications, skills, languages, salary expectations, notice period, work authorisation, CVs, résumés, cover letters, profile information, uploaded files, supporting documents, application answers, screening responses, messages, preferences, job alerts, saved jobs, account settings, usage data, and any other information submitted, uploaded, generated, inferred, or processed through the Services."),
          clause("3.5", "“Customer” means a recruiter, employer, recruitment agency, hiring team, company, organisation, integration partner, or other business customer that uses Ditto’s recruiter-facing or employer-facing services."),
          clause("3.6", "“De-identified Data” means data derived from Candidate Data, Platform usage, recruitment activity, or system information that has been aggregated, masked, transformed, anonymised, or stripped of identifiers in a manner intended to prevent the data from reasonably identifying you as a specific individual."),
          clause("3.7", "“Ditto Jobs” means the candidate-facing job discovery, profile, CV storage, application, and related functionality made available by Ditto, including through ditto.jobs and related interfaces."),
          clause("3.8", "“Integration Partner” means a third-party system, platform, website, job board, career page, applicant tracking system, recruitment system, employer website, agency website, or technical partner that connects with, embeds, receives information from, sends information to, or otherwise interoperates with Ditto."),
          clause("3.9", "“Platform” means Ditto’s hosted cloud-based technology environment, including websites, applications, databases, user interfaces, job widgets, career page tools, APIs, back-end systems, profile tools, application systems, and supporting infrastructure through which the Services are provided."),
          clause("3.10", "“Recruiter” means any recruiter, recruitment agency, employer, hiring manager, hiring team, talent acquisition team, Customer, Integration Partner, or other person or organisation that posts jobs, receives applications, manages hiring workflows, or otherwise uses Ditto in connection with recruitment or employment opportunities."),
          clause("3.11", "“Services” means the candidate-facing websites, job search tools, profile tools, CV upload tools, saved CV functionality, application forms, job widgets, career pages, integrations, AI Features, communication tools, job alerts, recommendations, and related technology services made available by Ditto from time to time."),
          clause("3.12", "“Third-Party Services” means products, software, platforms, systems, data providers, plugins, gateways, hosting providers, cloud providers, communication tools, authentication providers, analytics tools, advertising networks, AI providers, integrations, job boards, employer systems, recruitment systems, or other external services not owned or controlled by Ditto but which may interoperate with or support the Services."),
          clause("3.13", "“Widget” means any job display module, embedded code, feed, script, component, iframe, hosted snippet, career page component, application form, or similar technical tool provided by Ditto for the display, publication, syndication, or submission of jobs, applications, or candidate information on third-party websites or environments.")
      ]
    },
    {
      id: "section-4",
      number: "4",
      title: "Description of the Services",
      clauses: [
          clause("4.1", "Ditto provides candidate-facing technology that helps Candidates discover jobs, create candidate accounts, upload and save CVs, manage profile information, submit applications, interact with job widgets or career pages, and make their information available to Recruiters in connection with specific job opportunities."),
          clause("4.2", "Depending on the features available at the time, the Services may include functionality such as:", { list: ["candidate account creation;","candidate profile creation and management;","CV, résumé, and supporting document uploads;","saved CV and file management;","job search and job discovery;","job recommendations;","job alerts;","application forms;","career pages powered by Ditto;","embedded job widgets;","integration partner application flows;","screening questions or role-specific questions;","CV parsing and profile structuring;","AI-assisted summaries, matching, ranking, recommendations, or classifications;","application confirmations and related notifications;","recruiter-facing candidate summaries or structured application views;","analytics, advertising, and platform improvement functionality; and","future candidate-facing tools introduced by Ditto."], listStyle: "alpha" }),
          clause("4.3", "Ditto may make some Services available through ditto.jobs, ditto.work, job widgets, career pages, integration partners, customer websites, or other Ditto-controlled or Ditto-powered channels."),
          clause("4.4", "The Services may change over time. Ditto may improve, modify, expand, replace, remove, suspend, or discontinue particular features, interfaces, tools, or Services where reasonably necessary for business, technical, legal, product, security, or operational reasons.")
      ]
    },
    {
      id: "section-5",
      number: "5",
      title: "Ditto Is Not an Employer, Recruiter, Employment Agency, or Hiring Decision-Maker",
      clauses: [
          clause("5.1", "Ditto provides software and technology tools. Ditto is not an employer, recruiter, recruitment agency, employment agency, labour broker, staffing intermediary, executive search firm, employer of record, immigration adviser, legal adviser, or hiring decision-maker in relation to jobs posted by third parties."),
          clause("5.2", "Unless Ditto expressly posts a job for Ditto’s own internal hiring needs, Ditto does not employ Candidates, represent Candidates, negotiate employment terms, make hiring decisions, conduct interviews, issue job offers, guarantee job availability, or control the recruitment decisions of Recruiters."),
          clause("5.3", "Recruiters are responsible for their own jobs, hiring processes, recruitment decisions, communications, screening criteria, interviews, offers, rejections, employment terms, workplace conditions, and legal compliance."),
          clause("5.4", "Ditto does not guarantee that:", { list: ["any job exists or remains available;","any job description is complete or accurate;","any salary, location, working arrangement, benefit, or requirement is correct;","any Recruiter will review your application;","any Recruiter will acknowledge your application;","any Recruiter will contact you;","you will be shortlisted, interviewed, offered employment, or hired;","any application will lead to any particular outcome; or","any Recruiter will comply with its own obligations to you."], listStyle: "alpha" }),
          clause("5.5", "The Platform is a tool. Recruitment outcomes depend on Recruiters and on factors outside Ditto’s control.")
      ]
    },
    {
      id: "section-6",
      number: "6",
      title: "Scope of These Terms",
      clauses: [
          clause("6.1", "These Terms apply to the full candidate-facing Ditto ecosystem and to all Services, technology components, and delivery channels made available by Ditto, whether currently available or introduced in the future."),
          clause("6.2", "Without limitation, these Terms apply to:", { list: ["ditto.jobs;","ditto.work, where used for candidate-facing purposes;","candidate accounts;","candidate profiles;","saved CVs and uploaded files;","job search and job discovery tools;","application forms;","career pages powered by Ditto;","job widgets;","embedded recruitment components;","integration partner flows;","candidate-facing APIs or technical interfaces;","job alerts and recommendations;","AI Features;","beta, pilot, preview, or experimental candidate-facing features; and","any related support, communication, security, or ancillary services provided in connection with the candidate-facing Platform."], listStyle: "alpha" }),
          clause("6.3", "Unless Ditto expressly states otherwise in writing, all current and future candidate-facing Services made available under the Ditto brand form part of the Services governed by these Terms.")
      ]
    },
    {
      id: "section-7",
      number: "7",
      title: "Candidate Accounts",
      clauses: [
          clause("7.1", "You must create an Account before applying for a job through Ditto."),
          clause("7.2", "A complete candidate profile may not always be required at the point of registration. However, you may be required to provide additional information, upload a CV, complete profile sections, answer screening questions, or submit supporting documents when applying for particular jobs."),
          clause("7.3", "To create an Account, you may be required to provide information such as:", { list: ["first name;","last name;","email address;","password;","acceptance of these Terms; and","any other information reasonably required by Ditto during registration."], listStyle: "alpha" }),
          clause("7.4", "Ditto may also allow sign-in or registration through third-party authentication providers, including Google, Apple, or other providers made available from time to time."),
          clause("7.5", "You are responsible for keeping your login credentials secure and confidential. You must not share your password or allow another person to use your Account."),
          clause("7.6", "You are responsible for all activity conducted through your Account, except to the extent caused by Ditto’s own systems or conduct."),
          clause("7.7", "You must notify Ditto if you believe your Account has been accessed without permission, your password has been compromised, or your Account is being misused."),
          clause("7.8", "Ditto may require password resets, additional verification, account restrictions, or other security steps where reasonably necessary to protect your Account, other Candidates, Recruiters, or the Platform.")
      ]
    },
    {
      id: "section-8",
      number: "8",
      title: "Duplicate Accounts",
      clauses: [
          clause("8.1", "Each Account is linked to a unique email address. You cannot create more than one Account using the same email address."),
          clause("8.2", "If you try to register with an email address that is already in use, Ditto may require you to sign in to the existing Account or complete a password reset process."),
          clause("8.3", "You must not create multiple Accounts for deceptive, fraudulent, abusive, evasive, or manipulative purposes. You must not create multiple Accounts to avoid restrictions, submit repeated applications, bypass duplicate-application controls, misrepresent your identity, or interfere with the operation of the Services."),
          clause("8.4", "Ditto may suspend, restrict, merge operational records, archive, or close Accounts where it reasonably believes duplicate or multiple Accounts are being used improperly. Ditto is not obliged to merge candidate profiles or consolidate information across multiple email addresses.")
      ]
    },
    {
      id: "section-9",
      number: "9",
      title: "Candidate Fees",
      clauses: [
          clause("9.1", "Ditto does not charge Candidates any fee for using candidate-facing Services."),
          clause("9.2", "Without limitation, Ditto does not charge Candidates:", { list: ["application fees;","registration fees;","placement fees;","success fees;","subscription fees;","profile fees;","CV upload fees;","CV storage fees;","job alert fees;","recommendation fees;","recruitment fees; or","any other candidate service fee."], listStyle: "alpha" }),
          clause("9.3", "Ditto may generate revenue from Recruiters, employers, recruitment agencies, advertising, commercial partners, platform customers, or other business arrangements. This does not change the fact that Candidates are not charged by Ditto for candidate-facing Services."),
          clause("9.4", "If any Recruiter, employer, recruitment agency, individual, or third party asks you to pay money in connection with a job application, interview, assessment, training, equipment, work permit, visa, onboarding, placement, background check, or job offer, that request is not a charge imposed by Ditto and should be treated with caution."),
          clause("9.5", "Ditto does not authorise Recruiters to charge Candidates through Ditto for applying to jobs on the Platform. You should report suspicious payment requests to Ditto.")
      ]
    },
    {
      id: "section-10",
      number: "10",
      title: "Candidate Profiles, CVs, and Saved Files",
      clauses: [
          clause("10.1", "You may be able to create, update, and maintain a candidate profile through Ditto."),
          clause("10.2", "You may also be able to upload, save, manage, replace, or delete CVs, résumés, cover letters, certificates, portfolios, or other supporting documents."),
          clause("10.3", "Files uploaded by you may be linked to your Account and may be accessible from your candidate profile, subject to the functionality available at the time."),
          clause("10.4", "Your uploaded files are not automatically shared with every Recruiter. A CV, file, profile, application answer, or supporting document is made available to a Recruiter only where you apply for a job, submit information, or otherwise choose to make that information available in connection with a specific opportunity, career page, job widget, application flow, or integration partner process."),
          clause("10.5", "Ditto may parse, structure, analyse, classify, summarise, or extract information from your CVs, files, profile, or applications to help populate your profile, assist with job matching, support application workflows, provide Recruiters with structured application information, improve the Platform, and provide the Services."),
          clause("10.6", "Parsed or extracted information may update your global candidate profile, not only a single application. You are responsible for reviewing, correcting, and updating your profile information before submitting an Application.")
      ]
    },
    {
      id: "section-11",
      number: "11",
      title: "Supporting Documents and Sensitive Information",
      clauses: [
          clause("11.1", "Some jobs may require or request supporting documents, such as certificates, licences, portfolios, references, permits, identity documents, work authorisation documents, or other materials."),
          clause("11.2", "You should upload supporting documents only where they are relevant to a specific application or reasonably requested by a Recruiter."),
          clause("11.3", "You should avoid uploading unnecessary sensitive information unless it is clearly required for a legitimate recruitment purpose."),
          clause("11.4", "Sensitive information may include, depending on the context and applicable law, identity documents, passport details, health information, disability information, race or equity information, criminal history information, biometric information, financial information, payslips, work permits, tax details, or similar information."),
          clause("11.5", "If you choose to upload sensitive information, you are responsible for ensuring that the information is accurate and that you are comfortable submitting it in the relevant recruitment context."),
          clause("11.6", "Ditto may restrict, remove, quarantine, or refuse to process files that appear unlawful, unsafe, malicious, technically harmful, irrelevant, excessive, or inconsistent with these Terms.")
      ]
    },
    {
      id: "section-12",
      number: "12",
      title: "Applications",
      clauses: [
          clause("12.1", "When you apply for a job through Ditto, you submit information in connection with a specific job, Recruiter, employer, recruitment agency, hiring team, career page, job widget, or integration partner flow."),
          clause("12.2", "Your Application may include information such as your profile details, CV, selected saved file, supporting documents, work history, education history, skills, location, contact details, screening answers, role-specific answers, AI-structured information, and any other information requested or submitted through the application process."),
          clause("12.3", "Once you submit an Application, you may not be able to edit that specific Application. This is because the Application may already have been received, processed, reviewed, copied, acted upon, or progressed by the relevant Recruiter."),
          clause("12.4", "You may continue to update your global candidate profile after submitting an Application. Changes to your global profile may affect information visible through Ditto-controlled systems, depending on the functionality available at the time. However, changes to your profile may not update every copy, export, communication, external system, recruiter record, employer record, email, client submission, or third-party system that already received your information."),
          clause("12.5", "You may not submit multiple Applications for the same job using the same Account. Ditto may prevent duplicate applications or mark duplicate submissions as invalid."),
          clause("12.6", "Ditto does not guarantee that an Application will be received, reviewed, acknowledged, shortlisted, progressed, or responded to by any Recruiter.")
      ]
    },
    {
      id: "section-13",
      number: "13",
      title: "Recruiter Access to Candidate Data",
      clauses: [
          clause("13.1", "Ditto Jobs is not an open candidate database."),
          clause("13.2", "Recruiters cannot simply pay to search, browse, scrape, mine, or access all candidate profiles on Ditto Jobs."),
          clause("13.3", "Your candidate profile, CVs, files, and application information are made available to a Recruiter only where you deliberately apply, submit, or otherwise provide your information in connection with a specific job, opportunity, career page, widget, integration, or application flow."),
          clause("13.4", "Recruiters may receive, view, process, store, copy, use, forward, export, or otherwise handle your Application and related Candidate Data to the extent permitted by Ditto’s functionality, their own systems, applicable law, and their own privacy obligations."),
          clause("13.5", "Once your Candidate Data has been submitted to a Recruiter, that Recruiter may process it as an independent party or under its own privacy policy, terms, notices, legal obligations, and recruitment processes."),
          clause("13.6", "Ditto is not responsible for how a Recruiter handles Candidate Data outside Ditto-controlled systems.")
      ]
    },
    {
      id: "section-14",
      number: "14",
      title: "Recruitment Agencies, Confidential Roles, and Client Submissions",
      clauses: [
          clause("14.1", "Some jobs on Ditto may be posted by recruitment agencies, staffing companies, search firms, or other intermediaries acting on behalf of their own clients."),
          clause("14.2", "In those cases, the identity of the final employer or agency client may not always be disclosed in the job listing."),
          clause("14.3", "By applying to a job posted by a recruitment agency or similar intermediary, you understand that the agency may review your Application and may submit, share, or discuss your Candidate Data with its own client or prospective client in connection with the relevant opportunity."),
          clause("14.4", "Ditto does not control the agency’s client relationship, selection process, shortlist process, submission process, or communications outside Ditto-controlled systems."),
          clause("14.5", "You should contact the relevant Recruiter directly if you have questions about how your Application will be handled after submission.")
      ]
    },
    {
      id: "section-15",
      number: "15",
      title: "Job Listings",
      clauses: [
          clause("15.1", "Recruiters are responsible for the job listings they post, publish, syndicate, distribute, or make available through Ditto."),
          clause("15.2", "Ditto does not pre-screen every job listing before it appears on Ditto, a job widget, a career page, an integration partner flow, or another Ditto-powered interface."),
          clause("15.3", "Ditto may take steps to verify certain Recruiters, review suspicious activity, remove jobs, restrict accounts, or enforce job-posting standards. However, verification and enforcement measures are not perfect, and some inappropriate, inaccurate, expired, misleading, or fraudulent content may appear despite Ditto’s efforts."),
          clause("15.4", "Ditto may remove, suspend, restrict, de-index, or investigate job listings where Ditto reasonably believes they are false, misleading, expired, discriminatory, fraudulent, unlawful, abusive, exploitative, unsafe, spammy, inconsistent with Ditto’s standards, or otherwise harmful to Candidates or the Platform."),
          clause("15.5", "You may report suspicious, fraudulent, misleading, or inappropriate job listings to Ditto.")
      ]
    },
    {
      id: "section-16",
      number: "16",
      title: "Candidate Responsibilities",
      clauses: [
          clause("16.1", "You are responsible for the information you provide through the Services."),
          clause("16.2", "You must ensure that your profile, CVs, files, application answers, screening responses, supporting documents, and other Candidate Data are accurate, lawful, up to date, and not misleading."),
          clause("16.3", "You must not use the Services to:", { list: ["impersonate another person;","create a false identity;","submit false, fraudulent, misleading, or deceptive information;","submit Applications on behalf of another person without proper authority;","upload malicious, harmful, corrupted, or unsafe files;","submit unlawful, defamatory, discriminatory, abusive, threatening, harassing, obscene, or otherwise inappropriate content;","infringe the intellectual property, privacy, confidentiality, or other rights of another person;","harass, abuse, threaten, or spam Recruiters, employers, Ditto staff, or other users;","scrape, harvest, mine, copy, or systematically extract job listings, candidate information, or Platform data;","use bots, scripts, automated tools, or mass-application systems without Ditto’s written permission;","interfere with, overload, probe, scan, test, reverse engineer, or attack the Platform;","bypass access controls, duplicate-application controls, rate limits, security controls, or technical restrictions;","use the Services for unlawful, fraudulent, exploitative, or abusive purposes; or","do anything that may damage Ditto, the Platform, Recruiters, Candidates, or third parties."], listStyle: "alpha" }),
          clause("16.4", "Ditto may remove content, restrict functionality, suspend Accounts, archive records, block access, or take other enforcement action where it reasonably believes these Terms have been breached.")
      ]
    },
    {
      id: "section-17",
      number: "17",
      title: "AI Features and Automated Tools",
      clauses: [
          clause("17.1", "The Services may include AI Features that assist with parsing, extracting, structuring, summarising, classifying, ranking, recommending, matching, or analysing Candidate Data, job data, application information, recruiter requirements, or related recruitment information."),
          clause("17.2", "AI Features may be used to:", { list: ["parse CVs and files;","extract profile information;","populate or update candidate profiles;","identify skills, experience, education, industries, locations, or other attributes;","recommend jobs;","match Candidates to roles;","summarise Applications;","generate recruiter-facing candidate summaries;","assist with search results;","support screening workflows;","analyse job requirements;","improve platform functionality; and","support current or future candidate-facing or recruiter-facing Services."], listStyle: "alpha" }),
          clause("17.3", "AI Features are assistive only."),
          clause("17.4", "AI-generated or AI-assisted outputs may be incomplete, inaccurate, inconsistent, biased, non-deterministic, misleading, unsuitable, outdated, or inappropriate for a particular recruitment context."),
          clause("17.5", "The fact that information is generated, extracted, ranked, summarised, recommended, or displayed by the Platform does not mean it is correct, complete, lawful, fair, or suitable."),
          clause("17.6", "Ditto does not guarantee that any AI match, summary, ranking, recommendation, parsing result, extraction, classification, or job recommendation is accurate, complete, fair, unbiased, or suitable for your circumstances."),
          clause("17.7", "You are responsible for reviewing and correcting your profile, CV information, parsed information, and application information before submitting an Application."),
          clause("17.8", "Ditto does not make final employment decisions. Ditto does not reject Candidates for jobs. Recruiters may configure screening questions, qualifiers, workflow rules, eligibility criteria, or other settings that affect how an Application is received, filtered, prioritised, progressed, or declined. Those settings are controlled by the relevant Recruiter, employer, recruitment agency, hiring team, Customer, or Integration Partner, not by Ditto."),
          clause("17.9", "AI Features may be provided by Ditto systems or by third-party AI providers. The specific providers used may change from time to time.")
      ]
    },
    {
      id: "section-18",
      number: "18",
      title: "Communications, Job Alerts, and Notifications",
      clauses: [
          clause("18.1", "Ditto may send you service, transactional, security, account, application, and administrative communications relating to the Services."),
          clause("18.2", "These communications may include emails or notices relating to:", { list: ["account creation;","email verification;","password resets;","security alerts;","profile activity;","uploaded files;","application confirmations;","job alerts;","recommended jobs;","changes to the Services;","changes to these Terms;","privacy notices;","recruiter activity or application-related updates where available; and","support or operational messages."], listStyle: "alpha" }),
          clause("18.3", "Ditto may automatically enable job alerts, recommendations, or similar candidate communications when you register or use the Services. You may unsubscribe from marketing emails, job alerts, or non-essential communications where an unsubscribe or preference option is made available."),
          clause("18.4", "You may not be able to opt out of essential transactional, security, legal, account, or application-related messages."),
          clause("18.5", "Recruiters may contact you directly using the contact details you provide in an Application. Ditto is not responsible for communications sent by Recruiters outside Ditto-controlled systems."),
          clause("18.6", "Unless a specific messaging feature is made available by Ditto, candidate-to-recruiter messaging may occur outside the Platform and will be controlled by the relevant Recruiter.")
      ]
    },
    {
      id: "section-19",
      number: "19",
      title: "Privacy Summary",
      clauses: [
          clause("19.1", "Ditto processes Candidate Data in order to provide, operate, secure, support, improve, and enforce the Services."),
          clause("19.2", "This may include processing Candidate Data to create and manage Accounts, store CVs and files, process Applications, share Applications with relevant Recruiters, parse CVs, update profiles, provide job recommendations, send communications, maintain security, prevent fraud, support analytics, display advertising, improve the Platform, develop AI Features using De-identified Data, comply with legal obligations, and enforce these Terms."),
          clause("19.3", "Ditto may process Candidate Data using infrastructure, hosting, cloud, storage, analytics, advertising, security, email, authentication, AI, parsing, and other service providers. Providers and processing locations may change from time to time. Ditto may use providers such as Google, Microsoft Azure, Hetzner, AI providers, analytics providers, advertising networks, and other technical or operational partners, depending on the Services used and the technical requirements at the time."),
          clause("19.4", "Ditto may host or process data in different countries, regions, availability zones, or technical environments depending on the type of data, system architecture, provider availability, operational requirements, legal requirements, and service configuration."),
          clause("19.5", "Ditto’s separate Privacy Policy explains in more detail how Ditto collects, uses, shares, stores, protects, and handles personal information, including rights that may apply under POPIA, GDPR, California privacy laws, or other applicable privacy laws."),
          clause("19.6", "By using the Services, you acknowledge that Ditto will process Candidate Data in accordance with these Terms and the Privacy Policy."),
          clause("19.7", "Privacy questions may be sent to Ditto’s Data Officer at: info (at) dittojobs.com.")
      ]
    },
    {
      id: "section-20",
      number: "20",
      title: "Candidate Data Ownership and Licence",
      clauses: [
          clause("20.1", "You retain whatever ownership rights you have in your CVs, files, profile content, application answers, supporting documents, and other content you submit through the Services."),
          clause("20.2", "Ditto does not claim ownership of your Candidate Data merely because you submit it through the Platform."),
          clause("20.3", "However, by creating an Account, uploading information, saving files, submitting Applications, or using the Services, you grant Ditto a worldwide, non-exclusive, royalty-free, transferable, sublicensable licence to host, store, copy, process, transmit, display, format, parse, extract, analyse, classify, summarise, structure, index, secure, back up, share, and otherwise use Candidate Data to the extent reasonably necessary or useful for:", { list: ["providing the Services;","operating the Platform;","maintaining your Account;","storing your CVs and files;","processing Applications;","sharing Applications with relevant Recruiters;","enabling career pages, widgets, and integration partner flows;","parsing CVs and updating profiles;","providing search, matching, recommendations, and AI Features;","creating recruiter-facing application views and summaries;","communicating with you;","securing the Platform;","preventing fraud, abuse, scraping, spam, and misuse;","troubleshooting, support, testing, and debugging;","analytics and service improvement;","developing, testing, training, refining, and improving AI Features using De-identified Data;","complying with law; and","enforcing these Terms."], listStyle: "alpha" }),
          clause("20.4", "Ditto may use De-identified Data for analytics, benchmarking, product improvement, service improvement, research, AI development, model improvement, commercial insights, and other lawful purposes, provided such use does not reasonably identify you as a specific individual."),
          clause("20.5", "This licence continues for as long as reasonably necessary to provide the Services, process Applications, maintain records, comply with legal obligations, protect Ditto, protect Candidates or Recruiters, enforce rights, operate backups or archives, and use De-identified Data.")
      ]
    },
    {
      id: "section-21",
      number: "21",
      title: "Account Deletion, Retention, and Archived Records",
      clauses: [
          clause("21.1", "You may close or delete your Account through your profile settings where that functionality is available."),
          clause("21.2", "When you close or delete your Account, Ditto will remove or restrict your active candidate profile and revoke active Recruiter access to your profile, CVs, files, and Applications through Ditto-controlled systems, subject to technical, legal, security, operational, and backup limitations."),
          clause("21.3", "Deleting your Account does not necessarily delete every copy of your Candidate Data from every system, record, backup, archive, log, email, export, recruiter system, employer system, integration partner system, agency client system, or third-party environment."),
          clause("21.4", "Certain records may remain in restricted archives, backups, logs, security systems, fraud-prevention systems, legal records, audit records, dispute records, or technical recovery systems where reasonably necessary for legal, security, fraud-prevention, audit, dispute, operational, or technical purposes."),
          clause("21.5", "Archived records are not intended to be used for ordinary recruitment activity and should not remain available to Recruiters through ordinary Ditto candidate-search or application-access functionality."),
          clause("21.6", "Where your Candidate Data has already been lawfully received, stored, copied, forwarded, downloaded, exported, submitted, or otherwise processed by a Recruiter, employer, recruitment agency, agency client, integration partner, or other third party outside Ditto-controlled systems, that third party may continue to process such information under its own legal obligations, privacy policy, internal records, and retention rules."),
          clause("21.7", "Ditto may retain active Account information while your Account remains active. Ditto is not obliged to delete Candidate Data merely because you have not logged in for a period of time."),
          clause("21.8", "Ditto may review, archive, de-identify, restrict, or delete inactive Accounts or old records from time to time, including after extended inactivity, but any such action is at Ditto’s discretion unless required by applicable law."),
          clause("21.9", "De-identified Data may be retained indefinitely where it no longer reasonably identifies you as an individual.")
      ]
    },
    {
      id: "section-22",
      number: "22",
      title: "Cookies, Analytics, and Advertising",
      clauses: [
          clause("22.1", "Ditto may use cookies, pixels, tags, local storage, device identifiers, analytics tools, advertising technologies, and similar technologies in connection with the Services."),
          clause("22.2", "These technologies may be used for purposes such as:", { list: ["account login and authentication;","security and fraud prevention;","remembering preferences;","maintaining sessions;","measuring usage and performance;","understanding how Candidates use the Services;","debugging and improving functionality;","analytics and reporting;","displaying advertisements;","supporting advertising networks; and","complying with legal or technical requirements."], listStyle: "alpha" }),
          clause("22.3", "Some cookies or similar technologies are necessary for the Services to work properly. Others may be used for analytics, advertising, or non-essential purposes, subject to applicable law and any consent or preference controls made available by Ditto."),
          clause("22.4", "Ditto may display advertising through third-party advertising networks, including Google AdSense, Google AdX, or similar services. Advertising partners may use cookies or similar technologies in accordance with their own policies and applicable law."),
          clause("22.5", "Ditto may provide a cookie banner, consent tool, preference centre, or similar mechanism where legally required or operationally appropriate."),
          clause("22.6", "Additional information about cookies, analytics, and advertising may be provided in Ditto’s Privacy Policy, Cookie Policy, cookie notice, consent banner, or related notices.")
      ]
    },
    {
      id: "section-23",
      number: "23",
      title: "Third-Party Services and Integration Partners",
      clauses: [
          clause("23.1", "The Services may interoperate with Third-Party Services and Integration Partners."),
          clause("23.2", "This may include authentication providers, hosting providers, cloud providers, storage providers, database providers, email providers, analytics providers, advertising networks, AI providers, parsing providers, job boards, recruitment systems, applicant tracking systems, employer websites, recruitment agency websites, support tools, monitoring tools, security tools, and other technical or operational providers."),
          clause("23.3", "Third-Party Services are not owned or controlled by Ditto."),
          clause("23.4", "Where you interact with a Third-Party Service, Integration Partner, Recruiter website, employer website, recruitment agency system, external application process, or third-party link, additional terms and privacy policies may apply."),
          clause("23.5", "Ditto is not responsible for third-party websites, third-party systems, external recruitment processes, external privacy practices, third-party security practices, or third-party content outside Ditto-controlled systems."),
          clause("23.6", "Ditto may change, add, remove, replace, or update providers and Integration Partners from time to time."),
          clause("23.7", "Candidates may contact Ditto at info (at) dittojobs.com for more information about categories of providers used by Ditto.")
      ]
    },
    {
      id: "section-24",
      number: "24",
      title: "Acceptable Use",
      clauses: [
          clause("24.1", "You may use the Services only for lawful job search, candidate profile, CV management, application, and related career purposes."),
          clause("24.2", "You must not use the Services in a way that is unlawful, fraudulent, abusive, harmful, exploitative, deceptive, intrusive, technically disruptive, or inconsistent with these Terms."),
          clause("24.3", "Without limitation, you must not:", { list: ["misuse job listings;","submit fake Applications;","impersonate another person;","create Accounts using false or misleading information;","upload malware, viruses, scripts, or harmful files;","attack, probe, scan, overload, or interfere with the Platform;","scrape, harvest, copy, or extract Platform data without permission;","use bots or automated tools to submit Applications;","reverse engineer or attempt to derive source code from the Platform;","bypass authentication or access controls;","access data you are not authorised to access;","abuse reporting or support channels;","harass or threaten Recruiters, employers, Candidates, or Ditto staff;","use the Services for spam or unsolicited bulk communications;","submit unlawful, discriminatory, defamatory, abusive, obscene, or infringing content;","interfere with the security, integrity, availability, or performance of the Services; or","use the Services in a way that may expose Ditto, Candidates, Recruiters, or third parties to legal, security, operational, or reputational risk."], listStyle: "alpha" }),
          clause("24.4", "Ditto may monitor for misuse and take reasonable enforcement steps where necessary.")
      ]
    },
    {
      id: "section-25",
      number: "25",
      title: "Anti-Scraping and Platform Protection",
      clauses: [
          clause("25.1", "The Platform, including its structure, job data, candidate workflows, application systems, profile tools, user interfaces, databases, and compiled information, reflects substantial commercial investment, proprietary system design, and protected business value."),
          clause("25.2", "You may not use automated, semi-automated, or manual high-volume methods to extract, copy, harvest, scrape, mine, replicate, reconstitute, or appropriate material portions of the Platform or its data."),
          clause("25.3", "Prohibited conduct includes:", { list: ["scraping job listings at scale;","scraping candidate-facing interfaces;","using bots or scripts to extract records;","building shadow databases from Platform content;","copying Platform structure or workflows to create a competing service;","bypassing rate limits, API restrictions, or access controls;","using mass-application tools without authorisation; and","otherwise using the Platform as a source for unauthorised database extraction or competitive cloning."], listStyle: "alpha" }),
          clause("25.4", "Ditto reserves the right to monitor for abuse, rate-limit suspicious activity, block IP addresses, suspend Accounts, restrict access, and take legal action where it reasonably believes scraping, harvesting, automated abuse, or database misuse has occurred.")
      ]
    },
    {
      id: "section-26",
      number: "26",
      title: "Recruitment Scam Warnings and Reporting",
      clauses: [
          clause("26.1", "You should exercise caution when dealing with job opportunities, Recruiters, employers, agencies, individuals, or third parties."),
          clause("26.2", "Be careful if anyone asks you to:", { list: ["pay money to apply for a job;","pay money to secure an interview;","pay for training, equipment, checks, relocation, visas, permits, or onboarding before employment is confirmed;","share banking PINs, passwords, one-time passwords, or security codes;","provide unnecessary identity documents or sensitive information;","communicate only through suspicious personal channels;","accept unrealistic offers;","move conversations away from ordinary recruitment channels in suspicious circumstances; or","take urgent action under pressure."], listStyle: "alpha" }),
          clause("26.3", "Ditto does not authorise job scams, fraudulent recruitment activity, or misleading payment requests."),
          clause("26.4", "If you suspect that a job, Recruiter, employer, message, or request is fraudulent, misleading, abusive, discriminatory, or otherwise suspicious, you should report it to Ditto."),
          clause("26.5", "Ditto may investigate suspected scams, remove jobs, restrict Recruiters, suspend accounts, block activity, notify affected parties, or report suspected unlawful conduct to regulators or law enforcement where appropriate."),
          clause("26.6", "Ditto is not obliged to provide advance notice before taking action where speed is reasonably necessary to prevent harm, fraud, abuse, reputational damage, or further misuse.")
      ]
    },
    {
      id: "section-27",
      number: "27",
      title: "Candidate Indemnity",
      clauses: [
          clause("27.1", "To the extent permitted by law, you indemnify, defend, and hold harmless Ditto, its Affiliates, officers, directors, employees, contractors, service providers, and representatives from and against any claims, demands, actions, proceedings, losses, damages, liabilities, penalties, fines, costs, and expenses, including reasonable legal fees, arising out of or in connection with:", { list: ["your breach of these Terms;","your misuse of the Services;","your false, misleading, unlawful, or fraudulent information;","your uploaded files or content;","your infringement of another person’s rights;","your unauthorised use of another person’s information;","your unlawful or abusive conduct toward Recruiters, Candidates, Ditto, or third parties;","your use of bots, scraping, automation, or technical abuse; or","any claim caused by information or materials you submit through the Services."], listStyle: "alpha" }),
          clause("27.2", "This indemnity does not apply to the extent a claim is caused by Ditto’s own unlawful conduct or by liability that cannot legally be shifted to you under applicable law."),
          clause("27.3", "This clause survives termination of these Terms and closure of your Account.")
      ]
    },
    {
      id: "section-28",
      number: "28",
      title: "Disclaimers",
      clauses: [
          clause("28.1", "The Services are provided as candidate-facing technology tools and related services only."),
          clause("28.2", "Ditto does not warrant or guarantee that use of the Services will result in employment, interviews, recruiter responses, job offers, accurate matches, suitable recommendations, successful applications, career progression, salary improvement, or any other recruitment or employment outcome."),
          clause("28.3", "Without limiting the generality of the above, Ditto does not guarantee:", { list: ["the accuracy, quality, legality, fairness, or availability of jobs;","the identity, legitimacy, conduct, or responsiveness of Recruiters;","the accuracy of salary, location, benefit, experience, seniority, work arrangement, or job requirement information;","that any Application will be reviewed or acknowledged;","that any Recruiter will contact you;","that any Recruiter will comply with applicable law;","that any AI output, parsing result, match, ranking, recommendation, or summary will be correct;","that the Services will be uninterrupted, error-free, or available at all times;","that every defect or issue will be corrected; or","that the Services will meet your personal expectations or career objectives."], listStyle: "alpha" }),
          clause("28.4", "The Services are provided on an “as is” and “as available” basis, except to the extent applicable law requires otherwise."),
          clause("28.5", "You use the Services at your own risk and remain responsible for your own job search decisions, application decisions, communications, interview decisions, and employment decisions.")
      ]
    },
    {
      id: "section-29",
      number: "29",
      title: "Limitation of Liability",
      clauses: [
          clause("29.1", "Nothing in these Terms excludes, restricts, or limits any liability, right, remedy, warranty, or protection that cannot lawfully be excluded, restricted, or limited under applicable law."),
          clause("29.2", "To the maximum extent permitted by law, Ditto and its Affiliates, officers, employees, contractors, service providers, suppliers, and licensors shall not be liable to you for any indirect, incidental, special, punitive, exemplary, or consequential loss or damage arising out of or in connection with these Terms or the Services."),
          clause("29.3", "Without limitation, Ditto shall not be liable for:", { list: ["loss of employment;","loss of employment opportunity;","loss of interview opportunity;","loss of income;","loss of salary;","loss of benefits;","reputational damage;","emotional distress;","loss of goodwill;","loss or corruption of data beyond Ditto’s express legal obligations;","recruiter conduct;","employer conduct;","recruitment agency conduct;","third-party communications;","external processing of Candidate Data by Recruiters or third parties;","job scams not caused by Ditto;","inaccurate job listings;","unsuccessful applications;","AI outputs;","parsing errors;","matching errors;","recommendation errors;","unauthorised access caused by your failure to protect your credentials;","third-party services; or","decisions you or any Recruiter make based on information displayed through the Services."], listStyle: "alpha" }),
          clause("29.4", "To the maximum extent permitted by law, Ditto’s total aggregate liability arising out of or in connection with the Services, whether in contract, delict, negligence, statute, or otherwise, shall not exceed the greater of:", { list: ["the amount actually paid by you to Ditto for the relevant candidate-facing Services during the three months immediately preceding the event giving rise to the claim, which will usually be zero because Ditto does not charge Candidates; or","R1,000."], listStyle: "alpha" }),
          clause("29.5", "The exclusions and limitations in this clause apply even if a remedy fails of its essential purpose and even if Ditto was advised of the possibility of the relevant loss.")
      ]
    },
    {
      id: "section-30",
      number: "30",
      title: "Suspension and Termination",
      clauses: [
          clause("30.1", "Ditto may suspend, restrict, archive, or terminate your Account or access to the Services, in whole or in part, immediately or on notice, if Ditto reasonably believes that:", { list: ["you have breached these Terms;","you have submitted false, misleading, unlawful, or fraudulent information;","your Account is being misused;","your Account creates security, legal, operational, or reputational risk;","you have used the Services for scraping, bots, spam, abuse, or unlawful conduct;","suspension is necessary to investigate suspected fraud, abuse, or security issues;","continued access may harm Ditto, Candidates, Recruiters, or third parties;","Ditto is required to do so by law, regulator, court, or competent authority; or","Ditto decides to discontinue or materially change the relevant Services."], listStyle: "alpha" }),
          clause("30.2", "Suspension or termination may apply to your full Account, selected features, uploaded files, Applications, job alerts, or other functionality."),
          clause("30.3", "You may stop using the Services at any time. You may also close or delete your Account where account deletion functionality is available."),
          clause("30.4", "Termination, suspension, or Account closure does not affect accrued rights, Ditto’s right to retain certain records where permitted or required, or clauses intended to survive termination.")
      ]
    },
    {
      id: "section-31",
      number: "31",
      title: "Changes to the Services",
      clauses: [
          clause("31.1", "Ditto may modify, improve, expand, reduce, suspend, replace, discontinue, or change the Services from time to time."),
          clause("31.2", "Ditto may do this for business, technical, legal, product, commercial, security, operational, infrastructure, supplier, or user-experience reasons."),
          clause("31.3", "Ditto does not guarantee that any particular feature, interface, integration, job alert, recommendation tool, AI Feature, profile feature, application process, widget, career page, or workflow will remain available indefinitely."),
          clause("31.4", "Where reasonably practical, Ditto may provide notice of material changes. However, Ditto may make changes without advance notice where necessary for security, legal compliance, fraud prevention, abuse prevention, technical stability, or operational reasons.")
      ]
    },
    {
      id: "section-32",
      number: "32",
      title: "Changes to These Terms",
      clauses: [
          clause("32.1", "Ditto may amend, update, revise, or replace these Terms from time to time to reflect changes to the Services, legal requirements, privacy requirements, product functionality, AI Features, advertising practices, business practices, risk controls, or operational needs."),
          clause("32.2", "Where Ditto makes material changes, Ditto may take reasonable steps to notify you. This may include notice by email, account notification, website notice, in-product notice, acceptance prompt on next login, or another commercially reasonable method."),
          clause("32.3", "Unless otherwise stated, updated Terms become effective on the date specified in the revised version."),
          clause("32.4", "If you continue to access or use the Services after the effective date of updated Terms, such continued use constitutes acceptance of the updated Terms."),
          clause("32.5", "Ditto may require you to accept updated Terms when you next log in or before you continue using certain Services."),
          clause("32.6", "If you do not agree to updated Terms, you must stop using the Services and may close your Account.")
      ]
    },
    {
      id: "section-33",
      number: "33",
      title: "Policies",
      clauses: [
          clause("33.1", "Additional policies, notices, standards, or guidelines may apply to specific parts of the Services and are incorporated into these Terms where Ditto indicates that they apply."),
          clause("33.2", "These may include:", { list: ["the Privacy Policy;","the Cookie Policy;","cookie notices or consent notices;","job posting standards;","candidate-facing notices;","acceptable use rules;","AI feature notices;","beta feature notices;","security notices; and","product-specific terms."], listStyle: "alpha" }),
          clause("33.3", "Where there is a direct conflict between these Terms and the Privacy Policy in relation to the processing of personal information, the Privacy Policy will apply to the privacy issue to the extent of the conflict."),
          clause("33.4", "Where there is a direct conflict between these Terms and a product-specific written agreement expressly signed or accepted by Ditto, the product-specific written agreement will prevail to the extent of that conflict.")
      ]
    },
    {
      id: "section-34",
      number: "34",
      title: "Feedback and Suggestions",
      clauses: [
          clause("34.1", "If you submit ideas, feedback, suggestions, comments, improvements, feature requests, designs, workflows, or other input relating to Ditto or the Services, you agree that Ditto may use, copy, modify, adapt, implement, commercialise, publish, or otherwise exploit that feedback without restriction, attribution, approval, or compensation to you."),
          clause("34.2", "You must not submit feedback that you do not have the right to provide."),
          clause("34.3", "Feedback does not create any confidentiality obligation unless Ditto expressly agrees otherwise in writing.")
      ]
    },
    {
      id: "section-35",
      number: "35",
      title: "Ditto Intellectual Property",
      clauses: [
          clause("35.1", "Ditto and its licensors own all rights, title, and interest in and to the Platform, Services, software, interfaces, workflows, designs, databases, systems, algorithms, models, AI Features, branding, logos, trade names, documentation, and related intellectual property, excluding Candidate Data that belongs to you or third parties."),
          clause("35.2", "You may use the Services only as permitted by these Terms."),
          clause("35.3", "You may not copy, modify, distribute, sell, lease, sublicense, reverse engineer, decompile, disassemble, mirror, frame, reproduce, or create derivative works from the Services except as expressly permitted by Ditto in writing or by applicable law."),
          clause("35.4", "You may not use Ditto’s name, logo, branding, screenshots, interface designs, or other brand assets without Ditto’s prior written permission, except where permitted by law."),
          clause("35.5", "No rights are granted to you except as expressly set out in these Terms.")
      ]
    },
    {
      id: "section-36",
      number: "36",
      title: "Confidentiality",
      clauses: [
          clause("36.1", "In some recruitment processes, you may receive confidential or non-public information from Recruiters, employers, recruitment agencies, or Ditto."),
          clause("36.2", "You agree to treat confidential information responsibly and not misuse information that is clearly confidential, commercially sensitive, private, or provided to you for a limited recruitment purpose."),
          clause("36.3", "Ditto is not responsible for confidential information disclosed to you by Recruiters outside Ditto-controlled systems."),
          clause("36.4", "Nothing in this clause prevents you from using your own personal information, exercising legal rights, reporting unlawful conduct, making protected disclosures, or communicating with regulators or authorities where legally permitted.")
      ]
    },
    {
      id: "section-37",
      number: "37",
      title: "Force Majeure",
      clauses: [
          clause("37.1", "Ditto shall not be liable for any delay, failure, interruption, degradation, or inability to perform its obligations under these Terms to the extent caused by events, circumstances, or causes beyond its reasonable control."),
          clause("37.2", "Such events may include power failures, internet outages, cyber incidents, hosting failures, cloud provider failures, labour disputes, war, civil unrest, natural disasters, pandemics, government actions, regulatory restrictions, failures of third-party suppliers, or other events beyond Ditto’s reasonable control."),
          clause("37.3", "Where reasonably possible, Ditto will take commercially reasonable steps to mitigate the impact of such events."),
          clause("37.4", "However, Ditto will not be in breach of these Terms merely because performance is delayed or impaired by a qualifying force majeure event.")
      ]
    },
    {
      id: "section-38",
      number: "38",
      title: "Disputes and Contacting Ditto First",
      clauses: [
          clause("38.1", "If you have a concern, complaint, dispute, or issue relating to the Services, you should first contact Ditto and provide reasonable details so that Ditto has an opportunity to understand and address the issue."),
          clause("38.2", "You may contact Ditto at info (at) dittojobs.com."),
          clause("38.3", "Ditto will consider reasonable complaints in good faith, but Ditto does not guarantee any particular outcome, remedy, response time, employment outcome, or recruiter action."),
          clause("38.4", "Nothing in these Terms prevents you from contacting a regulator, law enforcement authority, consumer protection authority, privacy authority, court, tribunal, or other competent body where you have a legal right to do so."),
          clause("38.5", "Privacy complaints may also be directed to the relevant privacy or data protection authority where applicable, including the Information Regulator in South Africa where POPIA applies.")
      ]
    },
    {
      id: "section-39",
      number: "39",
      title: "Governing Law",
      clauses: [
          clause("39.1", "These Terms, and any dispute or claim arising out of or in connection with them, are governed by and interpreted in accordance with the laws of the Republic of South Africa, unless Ditto notifies you that a different Ditto contracting entity, governing law, or jurisdiction applies to a particular Service, region, account, product, or candidate-facing offering."),
          clause("39.2", "The choice of South African law applies regardless of your location, place of residence, data storage location, or place of use of the Services, subject always to any mandatory laws that may apply and cannot lawfully be excluded."),
          clause("39.3", "Where court proceedings are legally required or permitted, the parties agree that the courts of competent jurisdiction in South Africa may hear the matter, subject to any mandatory consumer, privacy, employment, or other laws that cannot lawfully be excluded.")
      ]
    },
    {
      id: "section-40",
      number: "40",
      title: "Company Information",
      clauses: [
          clause("40.1", "Ditto’s company details are as follows:", { address: ["Ditto Jobs (Pty) Ltd","Registration Number: 2015/372082/07","149 Upper Canterbury Street","Gardens","Cape Town","8001","Republic of South Africa"] }),
          clause("40.2", "General contact and privacy contact: info (at) dittojobs.com")
      ]
    }
  ]
};
