export const MAJORS = [
  {
    id: "structural",
    name: "Structural Engineering",
    description:
      "Designing the bones of buildings and bridges so they carry load, resist forces, and stay standing.",
    careers: ["Structural Engineer", "Bridge Designer", "Seismic Analyst"],
  },
  {
    id: "geotechnical",
    name: "Geotechnical Engineering",
    description:
      "Studying soil and rock so foundations, tunnels, and slopes hold up whatever gets built on them.",
    careers: ["Geotechnical Engineer", "Foundation Designer", "Site Investigation Engineer"],
  },
  {
    id: "transportation",
    name: "Transportation Engineering",
    description:
      "Planning and designing the roads, transit, and traffic systems that move people and goods.",
    careers: ["Transportation Engineer", "Traffic Systems Analyst", "Highway Designer"],
  },
  {
    id: "environmental",
    name: "Environmental Engineering",
    description:
      "Protecting air, water, and ecosystems from the impact of infrastructure and development.",
    careers: ["Environmental Engineer", "Water Quality Analyst", "Sustainability Consultant"],
  },
  {
    id: "water-resources",
    name: "Water Resources Engineering",
    description:
      "Managing how water moves through rivers, drainage, and supply systems, from floods to droughts.",
    careers: ["Water Resources Engineer", "Hydrologist", "Flood Risk Analyst"],
  },
  {
    id: "construction-management",
    name: "Construction Management",
    description:
      "Turning designs into finished projects by coordinating people, budgets, and schedules on site.",
    careers: ["Construction Manager", "Project Scheduler", "Site Superintendent"],
  },
  {
    id: "disaster-risk-reduction",
    name: "Disaster Risk Reduction Engineering",
    description:
      "Preparing infrastructure and communities to withstand and recover from earthquakes, floods, and other disasters.",
    careers: ["Disaster Risk Engineer", "Resilience Planner", "Emergency Infrastructure Analyst"],
  },
] as const;

export type Major = (typeof MAJORS)[number];
export type MajorId = Major["id"];
