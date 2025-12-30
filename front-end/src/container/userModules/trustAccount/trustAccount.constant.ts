const tooltipContent = {
  first:
    "A subcontractor is not directly engaged by the principal, developer or owner of the project. A supplier only supplies goods or services for the project without also carrying out building work.",
  second:
    "One (1) living unit includes e.g. a single detached dwelling, a duplex unit, or a residential unit designed for separate residential occupation.",
  third:
    "Maintenance work includes testing, taking samples and restoring the sample site, routine work to prevent deterioration, or routine replacement of a component at the end of its working life.",
  fourth:
    "Includes advisory work (inspection, investigation or provision of report) or design work (preparation of plans or specifications) carried out by an architect, professional engineer, building designer or landscape architect and contract administration work carried out by any of these professionals.",
  fifth:
    "Will the expected or estimated date for practical completion be less than 90 calendar days from the day the project trust account is required",
  six: "Queensland State Authority includes an agency, authority, commission, corporation or other entity established under legislation for a public or State purpose.",
  seventh:
    "Project trust work includes the construction, renovation or alteration of a building, any site work and work performed by architects, engineers and licensed surveyors within their professional practice.",
  eight: "That is, the head contractor has or must have a project trust",
};

const headProjectTrustOptions = [
  { value: "Yes", label: "Yes" },
  { value: "No", label: "No" },
  { value: "Unsure", label: "Unsure" },
];
const subcontractorOptions = [
  { value: "Yes", label: "Yes" },
  { value: "No", label: "No" },
];
const contractDateOptions = [
  {
    label: "01/03/2021 - 30/06/2021",
    value: "01/03/2021 - 30/06/2021",
  },
  {
    label: "01/07/2021 - 31/12/2021",
    value: "01/07/2021 - 31/12/2021",
  },
  {
    label: "01/01/2022 - 28/02/2025",
    value: "01/01/2022 - 28/02/2025",
  },
  {
    label: "01/03/2025 - 30/09/2025",
    value: "01/03/2025 - 30/09/2025",
  },
  {
    label: "01/10/2025 onwards",
    value: "01/10/2025 onwards",
  },
];
const cashRetentionOptions = [
  { value: "Yes", label: "Yes" },
  { value: "No", label: "No" },
];
const partyOptions = [
  { value: "State government", label: "State government" },
  {
    value: "Hospital and Health Service",
    label: "Hospital and Health Service",
  },
  {
    value: "Local government/State authority",
    label: "Local government/State authority",
  },
  { value: "Private", label: "Private" },
];
const contractValueOptions = [
  { value: "less than $1m", label: "less than $1m" },
  { value: "from $1m to less than $3m", label: "from $1m to less than $3m" },
  { value: "from $3m to less than $10m", label: "from $3m to less than $10m" },
  { value: "$10m or more", label: "$10m or more" },
];
const typeOfPersonOptions = [
  { value: "The head contractor", label: "The head contractor" },
  {
    value: "The principal/owner/developer",
    label: "The principal/owner/developer",
  },
  { value: "A sub-contractor", label: "A sub-contractor" },
  { value: "A government entity", label: "A government entity" },
];

const accountTypeProjectRadio = [
  {
    title: "Subcontractors and suppliers do not need a project trust.",
    content:
      "Note: A subcontractor is only required to have a project trust if it is a related entity to a head contractor who also has a project trust. Click here for more information.",
  },
  {
    title: "",
    content:
      "You don't need a Project Trust Account - Contracts where the only work is for residential construction for fewer than 3 living units don't require a Project Trust Account.",
  },
  {
    title: "",
    content:
      "You don't need a Project Trust Account - Contracts where the only work is for maintenance don't need a Project Trust Account.",
  },
  {
    title: "",
    content:
      "You don't need a Project Trust Account - contracts for professional design, advisory or contract administration don't need a Project Trust Account.",
  },
  {
    title: "",
    content:
      "You don't need a Project Trust Account - If there is less than 90 calendar days remaining until practical completion for the project you don't need a Project Trust Account.",
  },
  {
    title: "",
    content:
      "You don't need a Project Trust Account - Contracts where the only parties to the contract are the State of Queensland and a Queensland State Authority don't require a Project Trust Account",
  },
];

const accountTypeProjectSelect = [
  {
    title: "",
    content:
      "Based on your selections, you (the contracted party) are not required to set up a Project Trust Account.",
  },
  {
    title: "",
    content:
      "Based on your selections, you (the contracted party) are not required to set up a Project Trust Account.",
  },
];
const contractValueContent = [
  {
    contractDate: "",
    contractingParty: "",
    content:
      "Based on your selections, you (the contracted party) are not required to set up a Project Trust Account. Project Trust Accounts apply only to eligible contracts with a value of $1m or more.",
  },
  {
    contractDate: contractDateOptions[0]?.value,
    contractingParty: partyOptions[0]?.value,
    content: `Based on your selections, a Project Trust Account is required.

      From 1 March 2021, a contract is eligible for a Project Trust Account if -
      the contracting party is the State Government
      more than 50% of the contract price is for 'project trust work'
      the contract price is between $1M and $10M
      at least one subcontractor is engaged
      A Retention Trust Account may also be required where cash retentions are withheld for first tier subcontracts under the head contract`,
  },
  {
    contractDate: contractDateOptions[0]?.value,
    contractingParty: partyOptions[1]?.value,
    content:
      "Based on your selections, you (the contracted party) are not required to set up a Project Trust Account but later phases may apply to contracts similar to the one your selections are based on.",
  },
  {
    contractDate: contractDateOptions[0]?.value,
    contractingParty: partyOptions[2]?.value,
    content:
      "Based on your selections, you (the contracted party) are not required to set up a Project Trust Account but later phases may apply to contracts similar to the one your selections are based on.",
  },
  {
    contractDate: contractDateOptions[0]?.value,
    contractingParty: partyOptions[3]?.value,
    content:
      "Based on your selections, you (the contracted party) are not required to set up a Project Trust Account but later phases may apply to contracts similar to the one your selections are based on.",
  },
];
const projectSwitchConfirmation =
  "Are you sure you want to change the trust account type? This will clear your answers.";

const retentionTypeSelect = [
  {
    title: "",
    content:
      "A retention trust account is not required. Trust accounts only apply to cash retention amounts withheld under a contract, not other forms of security.",
  },
  {
    title:
      "A retention trust account is not required and/or the cash retention amounts must not be held in a retention trust account.",
    content:
      "NOTE: If there is an amendment to the head contract and it becomes eligible for project trust, a retention trust account may also be required for other parties related to the project that are withholding eligible cash retention amounts. A reassessment of the retention trust eligibility criteria should be conducted by all parties on amendment of the head contract.",
  },
  {
    title: "",
    content:
      "You may have received a Notice of Project Trust if you are contracting directly with the head contractor. Alternatively, you can search the Trust Account Register to search for the project or change your selection to Project Trust Tool to work out if one is required.",
  },
  {
    title:
      "A retention trust account is required for any retention amount you withhold. If you already have a retention trust account, the cash retention amounts must be held in this account.",
    content:
      "NOTE: You only need one retention trust account for retention amounts withheld across all project trust projects whereas a separate project trust account is required per project.",
  },
  {
    title:
      "A retention trust account is required for any retention amount you withhold. If you already have a retention trust account, the cash retention amounts must be held in this account.",
    content:
      "NOTE: You only need one retention trust account for retention amounts withheld across all project trust projects.",
  },
  {
    title: "",
    content:
      "A retention trust account is not currently required. However, from 1 October 2025 a retention trust account is required for any retention amount withheld under the withholding contract and retention amounts already withheld before that date must be transferred into the retention trust account.",
  },
  {
    title: "",
    content:
      "Retention trust accounts are not required by the State, the Commonwealth, a state authority or a local government.",
  },
];

const projectTypeRadio = [
  {
    title: "",
    content:
      "A person is not paid from a Project Trust Account if the trustee is not liable to pay them for the work.",
  },
  {
    title: "",
    content:
      "Only the trustee's first tier subcontractors are paid from a Project Trust Account.",
  },
  {
    title: "",
    content: "Employees are not paid from a Project Trust Account.",
  },
  {
    title: "",
    content:
      "A contractor decides how to do the job they have been contracted to do, and invoices the person who hired them for the work, which results in a profit or loss for the contractor. An employee performs the jobs set by their employer, in the way their employer tells them to, receives payment regularly, and bears no financial risk. Choose another option to continue.",
  },
  {
    title: "",
    content: "This type of work is not paid from a Project Trust Account.",
  },
];

const PROJECT = "project";
const RETENTION = "retention";
const CONFIRMATION = "confirmation";
const projectRadioOptions = {
  TRUSTEE_OF_PROJECT_TRUST: "The trustee of a project trust",
  SOMEONE_ELSE: "Someone else",
  CONTRACTOR_UNDER_SUBCONTRACT_WITH_TRUSTEE:
    "A contractor engaged under a subcontract with the trustee",
  CONTRACTOR_UNDER_SUBCONTRACT_WITH_PARTY:
    "A contractor engaged under a subcontract with a party other than the trustee",
  AN_EMPLOYEE: "An employee",
  NOT_SURE: "Not sure",
  DRILLING_EXTRACTING: "Drilling/extracting oil/gas or extracting minerals",
  SUPPLY_ONLY:
    "Supply only (of products that the person did not prefabricate) or ongoing maintenance work (where it is only remaining work for the project)",
  NONE_OF_THE_ABOVE: "None of the above",
  BUILDING_CONSTRUCTION_SITE:
    "On a building or at a building/construction site",
  OFFSITE_ADVISORY: "Offsite or advisory",
};

export {
  PROJECT,
  RETENTION,
  CONFIRMATION,
  projectSwitchConfirmation,
  projectRadioOptions,
  tooltipContent,
  headProjectTrustOptions,
  subcontractorOptions,
  cashRetentionOptions,
  partyOptions,
  contractValueOptions,
  typeOfPersonOptions,
  accountTypeProjectRadio,
  accountTypeProjectSelect,
  contractDateOptions,
  contractValueContent,
  retentionTypeSelect,
  projectTypeRadio,
};
