export type OrganSystemId =
  | 'torso'
  | 'heart'
  | 'brain'
  | 'lungs'
  | 'digestive'
  | 'kidneys';

export type ViewMode = 'anatomical' | 'xray' | 'wireframe';

export type CameraPreset = 'front' | 'left' | 'right' | 'superior' | 'reset';

export interface AnatomicalPartInfo {
  id: string;
  organId: Exclude<OrganSystemId, 'torso'>;
  name: string;
  latinName: string;
  system: string;
  summary: string;
  function: string;
  clinicalNote: string;
  metrics: { label: string; value: string }[];
}

export interface OrganOverview {
  id: OrganSystemId;
  label: string;
  latinName: string;
  system: string;
  description: string;
  defaultCamera: {
    position: [number, number, number];
    target: [number, number, number];
  };
  parts: string[];
}

export const ORGAN_OVERVIEWS: Record<OrganSystemId, OrganOverview> = {
  torso: {
    id: 'torso',
    label: 'Full Torso',
    latinName: 'Truncus Humanus',
    system: 'Integrated Visceral Systems',
    description:
      'Spatial overview of major thoracic and abdominal organs within the ribcage reference frame. Click any organ to inspect its structure or use Explode to separate systems.',
    defaultCamera: {
      position: [0, 0.3, 6.2],
      target: [0, 0.05, 0],
    },
    parts: [
      'heart_ventricles',
      'lung_right',
      'lung_left',
      'liver_right_lobe',
      'stomach_body',
      'kidney_left',
    ],
  },
  heart: {
    id: 'heart',
    label: 'Heart',
    latinName: 'Cor',
    system: 'Cardiovascular System',
    description:
      'Four-chambered muscular pump driving systemic and pulmonary circulation. Contracts ~100,000 times daily via coordinated electrical conduction.',
    defaultCamera: {
      position: [0.6, 0.35, 3.1],
      target: [0, 0.05, 0],
    },
    parts: [
      'heart_ventricles',
      'heart_atria',
      'heart_aorta',
      'heart_pulmonary',
      'heart_vena_cava',
      'heart_coronary',
    ],
  },
  brain: {
    id: 'brain',
    label: 'Brain',
    latinName: 'Encephalon',
    system: 'Central Nervous System',
    description:
      'Primary command center of the nervous system, comprising folded cerebral hemispheres, cerebellum, and brainstem.',
    defaultCamera: {
      position: [1.9, 0.55, 2.4],
      target: [0, 0, 0],
    },
    parts: [
      'brain_cerebrum_left',
      'brain_cerebrum_right',
      'brain_corpus_callosum',
      'brain_cerebellum',
      'brain_brainstem',
    ],
  },
  lungs: {
    id: 'lungs',
    label: 'Lungs',
    latinName: 'Pulmones',
    system: 'Respiratory System',
    description:
      'Paired spongy organs facilitating alveolar gas exchange of oxygen and carbon dioxide across ~70 m² of respiratory membrane.',
    defaultCamera: {
      position: [0.4, 0.35, 3.9],
      target: [0, 0.05, 0],
    },
    parts: [
      'lung_trachea',
      'lung_bronchi',
      'lung_right',
      'lung_left',
      'lung_diaphragm',
    ],
  },
  digestive: {
    id: 'digestive',
    label: 'Liver & Stomach',
    latinName: 'Hepar et Gaster',
    system: 'Digestive System',
    description:
      'Upper gastrointestinal and hepatobiliary organs responsible for metabolic detoxification, bile synthesis, and enzymatic gastric digestion.',
    defaultCamera: {
      position: [0.5, 0.25, 3.6],
      target: [0, -0.05, 0],
    },
    parts: [
      'liver_right_lobe',
      'liver_left_lobe',
      'gallbladder',
      'stomach_esophagus',
      'stomach_body',
      'duodenum',
    ],
  },
  kidneys: {
    id: 'kidneys',
    label: 'Kidneys',
    latinName: 'Renes',
    system: 'Renal & Urinary System',
    description:
      'Retroperitoneal bean-shaped organs filtering ~180 liters of blood plasma daily to regulate fluid balance, electrolytes, and blood pressure.',
    defaultCamera: {
      position: [0.3, 0.25, 3.4],
      target: [0, 0, 0],
    },
    parts: [
      'kidney_left',
      'kidney_right',
      'adrenal_glands',
      'renal_vessels',
      'ureters',
    ],
  },
};

export const ANATOMICAL_PARTS: Record<string, AnatomicalPartInfo> = {
  // HEART
  heart_ventricles: {
    id: 'heart_ventricles',
    organId: 'heart',
    name: 'Ventricular Myocardium',
    latinName: 'Ventriculi Cordis',
    system: 'Cardiovascular',
    summary:
      'Thick-walled inferior chambers (left and right ventricles) responsible for ejecting blood into the aorta and pulmonary trunk.',
    function:
      'The left ventricle has a myocardium 3x thicker than the right to generate ~120 mmHg systemic systolic pressure.',
    clinicalNote:
      'Ventricular hypertrophy commonly develops in response to chronic hypertension or aortic stenosis.',
    metrics: [
      { label: 'Resting Rate', value: '60–100 bpm' },
      { label: 'Stroke Volume', value: '70 mL' },
      { label: 'Ejection Fraction', value: '55–70%' },
    ],
  },
  heart_atria: {
    id: 'heart_atria',
    organId: 'heart',
    name: 'Atria & Auricles',
    latinName: 'Atria Cordis',
    system: 'Cardiovascular',
    summary:
      'Superior receiving chambers that collect venous return from the venae cavae (right) and pulmonary veins (left).',
    function:
      'Atrial contraction ("atrial kick") contributes the final ~20% of ventricular filling at the end of diastole.',
    clinicalNote:
      'The sinoatrial (SA) node in the right atrium acts as the heart’s natural pacemaker.',
    metrics: [
      { label: 'Wall Thickness', value: '2–3 mm' },
      { label: 'RA Pressure', value: '2–6 mmHg' },
      { label: 'LA Pressure', value: '6–12 mmHg' },
    ],
  },
  heart_aorta: {
    id: 'heart_aorta',
    organId: 'heart',
    name: 'Aortic Arch & Branches',
    latinName: 'Arcus Aortae',
    system: 'Cardiovascular',
    summary:
      'The largest elastic artery in the body, arching superiorly from the left ventricle with three major head-and-arm trunks.',
    function:
      'Elastic recoil of the aortic wall (Windkessel effect) maintains diastolic blood flow throughout systemic arteries.',
    clinicalNote:
      'Gives rise to the brachiocephalic trunk, left common carotid, and left subclavian arteries.',
    metrics: [
      { label: 'Peak Velocity', value: '1.0–1.7 m/s' },
      { label: 'Diameter', value: '25–30 mm' },
      { label: 'Oxygen Sat.', value: '95–100%' },
    ],
  },
  heart_pulmonary: {
    id: 'heart_pulmonary',
    organId: 'heart',
    name: 'Pulmonary Trunk',
    latinName: 'Truncus Pulmonalis',
    system: 'Cardiovascular',
    summary:
      'Arises from the right ventricle and bifurcates into the left and right pulmonary arteries carrying deoxygenated blood to the lungs.',
    function:
      'Delivers venous blood to alveolar capillaries for oxygenation at low pressure (~25/10 mmHg).',
    clinicalNote:
      'The only arteries in the postnatal body that carry deoxygenated blood.',
    metrics: [
      { label: 'Mean Pressure', value: '14 mmHg' },
      { label: 'Length', value: '~5 cm' },
      { label: 'Oxygen Sat.', value: '~75%' },
    ],
  },
  heart_vena_cava: {
    id: 'heart_vena_cava',
    organId: 'heart',
    name: 'Superior & Inferior Vena Cava',
    latinName: 'Vena Cava Superior et Inferior',
    system: 'Cardiovascular',
    summary:
      'Great venous trunks returning systemic deoxygenated blood from the upper and lower body into the right atrium.',
    function:
      'Maintains continuous low-resistance venous return aided by respiratory intrathoracic pressure changes.',
    clinicalNote:
      'Central venous catheters are typically positioned at the cavoatrial junction.',
    metrics: [
      { label: 'SVC Diameter', value: '18–22 mm' },
      { label: 'IVC Diameter', value: '20–25 mm' },
      { label: 'CVP', value: '2–8 mmHg' },
    ],
  },
  heart_coronary: {
    id: 'heart_coronary',
    organId: 'heart',
    name: 'Coronary Arteries',
    latinName: 'Arteriae Coronariae',
    system: 'Cardiovascular',
    summary:
      'Epicardial vessels branching from the aortic root to supply oxygenated blood directly to the myocardium.',
    function:
      'Unlike systemic organs, coronary perfusion occurs predominantly during ventricular diastole when muscle tension relaxes.',
    clinicalNote:
      'The left anterior descending (LAD) artery supplies the anterior interventricular septum and apex.',
    metrics: [
      { label: 'Blood Flow', value: '250 mL/min' },
      { label: 'O₂ Extraction', value: '70–80%' },
      { label: 'Cardiac Share', value: '~5% CO' },
    ],
  },

  // BRAIN
  brain_cerebrum_left: {
    id: 'brain_cerebrum_left',
    organId: 'brain',
    name: 'Left Cerebral Hemisphere',
    latinName: 'Hemispherium Cerebri Sinistrum',
    system: 'Nervous',
    summary:
      'Folded cortical hemisphere divided into frontal, parietal, temporal, and occipital lobes; dominant for language in most individuals.',
    function:
      'Controls contralateral (right-sided) motor and somatosensory function, Broca’s speech production, and Wernicke’s comprehension.',
    clinicalNote:
      'Cortical gyri (ridges) and sulci (grooves) triple the surface area of gray matter within the cranial vault.',
    metrics: [
      { label: 'Cortical Neurons', value: '~8 billion' },
      { label: 'Cortical Area', value: '~1,200 cm²' },
      { label: 'Glucose Use', value: '20% body' },
    ],
  },
  brain_cerebrum_right: {
    id: 'brain_cerebrum_right',
    organId: 'brain',
    name: 'Right Cerebral Hemisphere',
    latinName: 'Hemispherium Cerebri Dextrum',
    system: 'Nervous',
    summary:
      'Mirror cerebral hemisphere specialized for visuospatial processing, prosody, and contralateral left-sided motor control.',
    function:
      'Integrates spatial attention, facial recognition, and holistic sensory synthesis across its four lobes.',
    clinicalNote:
      'Right parietal lobe lesions can result in contralateral hemispatial neglect.',
    metrics: [
      { label: 'Brain Weight', value: '1,300–1,400 g' },
      { label: 'Blood Flow', value: '750 mL/min' },
      { label: 'O₂ Consumption', value: '20% total' },
    ],
  },
  brain_corpus_callosum: {
    id: 'brain_corpus_callosum',
    organId: 'brain',
    name: 'Corpus Callosum',
    latinName: 'Corpus Callosum',
    system: 'Nervous',
    summary:
      'Thick C-shaped commissural tract of ~200 million myelinated axons connecting the left and right cerebral hemispheres.',
    function:
      'Synchronizes motor, sensory, and cognitive information between hemispheres in milliseconds.',
    clinicalNote:
      'Use the Explode slider to separate the hemispheres and reveal the corpus callosum.',
    metrics: [
      { label: 'Axon Count', value: '~200M' },
      { label: 'Length', value: '~10 cm' },
      { label: 'Conduction', value: '5–30 m/s' },
    ],
  },
  brain_cerebellum: {
    id: 'brain_cerebellum',
    organId: 'brain',
    name: 'Cerebellum',
    latinName: 'Cerebellum',
    system: 'Nervous',
    summary:
      'Finely striated ("foliated") bilobed structure tucked beneath the occipital lobes in the posterior cranial fossa.',
    function:
      'Coordinates posture, balance, motor learning, and smooth timing of voluntary movements without initiating them.',
    clinicalNote:
      'Contains more than half of all neurons in the entire human brain despite representing only 10% of its volume.',
    metrics: [
      { label: 'Neurons', value: '~69 billion' },
      { label: 'Volume Share', value: '10% brain' },
      { label: 'Folia Depth', value: '1–2 mm' },
    ],
  },
  brain_brainstem: {
    id: 'brain_brainstem',
    organId: 'brain',
    name: 'Brainstem (Pons & Medulla)',
    latinName: 'Truncus Encephali',
    system: 'Nervous',
    summary:
      'Vital stalk linking the cerebrum and cerebellum to the spinal cord, housing cranial nerve nuclei III–XII.',
    function:
      'Regulates autonomic life-support functions: respiratory rhythm, heart rate, blood pressure, and sleep-wake arousal.',
    clinicalNote:
      'All ascending sensory and descending motor tracts pass through this compact anatomical bottleneck.',
    metrics: [
      { label: 'Cranial Nerves', value: 'CN III–XII' },
      { label: 'Length', value: '~7.5 cm' },
      { label: 'Vital Centers', value: 'Resp / Cardio' },
    ],
  },

  // LUNGS
  lung_trachea: {
    id: 'lung_trachea',
    organId: 'lungs',
    name: 'Trachea',
    latinName: 'Trachea',
    system: 'Respiratory',
    summary:
      'Fibromuscular airway reinforced by 16–20 C-shaped hyaline cartilage rings to prevent collapse during inspiration.',
    function:
      'Conducts, warms, humidifies, and filters inhaled air via pseudostratified ciliated epithelium.',
    clinicalNote:
      'Bifurcates at the carina (level of T4–T5) into the left and right mainstem bronchi.',
    metrics: [
      { label: 'Length', value: '10–12 cm' },
      { label: 'Diameter', value: '18–22 mm' },
      { label: 'Cartilage Rings', value: '16–20' },
    ],
  },
  lung_bronchi: {
    id: 'lung_bronchi',
    organId: 'lungs',
    name: 'Bronchial Tree',
    latinName: 'Arbor Bronchialis',
    system: 'Respiratory',
    summary:
      'Branching airway conduits dividing into primary, lobar, and segmental bronchi inside each lung hilum.',
    function:
      'Distributes inspired air across 23 generations of branching down to terminal bronchioles and alveolar sacs.',
    clinicalNote:
      'The right main bronchus is wider, shorter, and more vertical than the left.',
    metrics: [
      { label: 'Generations', value: '23 levels' },
      { label: 'Right Angle', value: '~25°' },
      { label: 'Left Angle', value: '~45°' },
    ],
  },
  lung_right: {
    id: 'lung_right',
    organId: 'lungs',
    name: 'Right Lung (3 Lobes)',
    latinName: 'Pulmo Dexter',
    system: 'Respiratory',
    summary:
      'Slightly larger and shorter than the left lung, divided into superior, middle, and inferior lobes by two fissures.',
    function:
      'Performs ~55% of total pulmonary gas exchange across ~300 million shared alveoli.',
    clinicalNote:
      'Separated by the oblique and horizontal fissures; rests above the right hemidiaphragm and liver.',
    metrics: [
      { label: 'Lobes', value: '3 lobes' },
      { label: 'Segments', value: '10 segments' },
      { label: 'Ventilation', value: '~55%' },
    ],
  },
  lung_left: {
    id: 'lung_left',
    organId: 'lungs',
    name: 'Left Lung (2 Lobes)',
    latinName: 'Pulmo Sinister',
    system: 'Respiratory',
    summary:
      'Divided into superior and inferior lobes by a single oblique fissure, featuring an anterior cardiac notch.',
    function:
      'Accommodates the leftward-tilted apex of the heart while providing ~45% of pulmonary gas exchange.',
    clinicalNote:
      'The lingula of the left superior lobe is the embryological homolog of the right middle lobe.',
    metrics: [
      { label: 'Lobes', value: '2 lobes' },
      { label: 'Total Capacity', value: '~6.0 L' },
      { label: 'Tidal Volume', value: '500 mL' },
    ],
  },
  lung_diaphragm: {
    id: 'lung_diaphragm',
    organId: 'lungs',
    name: 'Thoracic Diaphragm',
    latinName: 'Diaphragma',
    system: 'Respiratory',
    summary:
      'Dome-shaped musculotendinous partition separating the thoracic and abdominal cavities.',
    function:
      'Primary muscle of inspiration; contracts and flattens downward to create negative intrathoracic pressure.',
    clinicalNote:
      'Innervated by the phrenic nerve (C3, C4, C5 — "C3, 4, 5 keeps the diaphragm alive").',
    metrics: [
      { label: 'Excursion', value: '1.5–7 cm' },
      { label: 'Work Share', value: '75% insp.' },
      { label: 'Innervation', value: 'C3–C5' },
    ],
  },

  // DIGESTIVE
  liver_right_lobe: {
    id: 'liver_right_lobe',
    organId: 'digestive',
    name: 'Liver — Right Lobe',
    latinName: 'Lobus Hepatis Dexter',
    system: 'Digestive / Metabolic',
    summary:
      'Largest anatomical lobe of the liver, occupying the right upper quadrant beneath the diaphragm.',
    function:
      'Synthesizes plasma proteins and bile, regulates blood glucose via glycogenolysis, and detoxifies portal venous blood.',
    clinicalNote:
      'Receives dual blood supply: ~75% from the hepatic portal vein and ~25% from the hepatic artery.',
    metrics: [
      { label: 'Organ Mass', value: '1.4–1.6 kg' },
      { label: 'Blood Flow', value: '1,450 mL/min' },
      { label: 'Bile Output', value: '600–1,000 mL/d' },
    ],
  },
  liver_left_lobe: {
    id: 'liver_left_lobe',
    organId: 'digestive',
    name: 'Liver — Left Lobe & Falciform Ligament',
    latinName: 'Lobus Hepatis Sinister',
    system: 'Digestive / Metabolic',
    summary:
      'Tapered medial lobe extending across the midline anterior to the stomach, separated by the falciform ligament.',
    function:
      'Shares identical lobular metabolic architecture with the right lobe, housing Kupffer cells and hepatocytes.',
    clinicalNote:
      'Capable of remarkable functional regeneration even after partial surgical resection.',
    metrics: [
      { label: 'Segments', value: '8 Couinaud' },
      { label: 'Lobules', value: '~100,000' },
      { label: 'Regen Time', value: '2–4 weeks' },
    ],
  },
  gallbladder: {
    id: 'gallbladder',
    organId: 'digestive',
    name: 'Gallbladder & Biliary Tract',
    latinName: 'Vesica Biliaris',
    system: 'Digestive',
    summary:
      'Pear-shaped muscular sac nestled beneath the right hepatic lobe, connected via the cystic and common bile ducts.',
    function:
      'Stores and concentrates hepatic bile 5–10x, contracting under cholecystokinin (CCK) stimulation to emulsify dietary fats.',
    clinicalNote:
      'Concentrated bile salts can precipitate into gallstones (cholelithiasis) when cholesterol-bile ratios shift.',
    metrics: [
      { label: 'Capacity', value: '30–50 mL' },
      { label: 'Length', value: '7–10 cm' },
      { label: 'Concentration', value: '5–10x' },
    ],
  },
  stomach_esophagus: {
    id: 'stomach_esophagus',
    organId: 'digestive',
    name: 'Distal Esophagus & Cardia',
    latinName: 'Oesophagus et Cardia',
    system: 'Digestive',
    summary:
      'Muscular food-conducting tube piercing the diaphragm at T10 to enter the gastric cardia.',
    function:
      'Peristaltic waves propel boluses downward through the lower esophageal sphincter (LES), preventing acid reflux.',
    clinicalNote:
      'Transitions from stratified squamous epithelium to simple columnar gastric mucosa at the Z-line.',
    metrics: [
      { label: 'Total Length', value: '~25 cm' },
      { label: 'LES Pressure', value: '15–30 mmHg' },
      { label: 'Transit Time', value: '4–8 sec' },
    ],
  },
  stomach_body: {
    id: 'stomach_body',
    organId: 'digestive',
    name: 'Stomach (Fundus, Body & Pylorus)',
    latinName: 'Gaster',
    system: 'Digestive',
    summary:
      'J-shaped muscular reservoir with greater and lesser curvatures, lined internally by folded gastric rugae.',
    function:
      'Secretes hydrochloric acid (pH 1.5–2.0) and pepsinogen while churning food into acidic chyme.',
    clinicalNote:
      'Three smooth muscle layers (oblique, circular, longitudinal) enable forceful mechanical mixing.',
    metrics: [
      { label: 'Gastric pH', value: '1.5–2.0' },
      { label: 'Max Volume', value: '1.5–2.0 L' },
      { label: 'Acid Output', value: '1.5–2.0 L/d' },
    ],
  },
  duodenum: {
    id: 'duodenum',
    organId: 'digestive',
    name: 'Duodenum',
    latinName: 'Duodenum',
    system: 'Digestive',
    summary:
      'C-shaped proximal segment of the small intestine receiving chyme from the pylorus, bile, and pancreatic enzymes.',
    function:
      'Neutralizes gastric acid via Brunner’s gland bicarbonate and initiates rapid macronutrient absorption.',
    clinicalNote:
      'The major duodenal papilla (ampulla of Vater) is the shared entry point for bile and pancreatic juice.',
    metrics: [
      { label: 'Length', value: '25–30 cm' },
      { label: 'Luminal pH', value: '6.0–7.0' },
      { label: 'Parts', value: '4 segments' },
    ],
  },

  // KIDNEYS
  kidney_left: {
    id: 'kidney_left',
    organId: 'kidneys',
    name: 'Left Kidney',
    latinName: 'Ren Sinister',
    system: 'Renal',
    summary:
      'Bean-shaped retroperitoneal organ positioned slightly higher than the right kidney (T12–L3) due to the liver.',
    function:
      'Filters blood plasma through ~1 million nephrons to excrete nitrogenous wastes and regulate electrolyte homeostasis.',
    clinicalNote:
      'The left renal vein is longer than the right and crosses anterior to the abdominal aorta.',
    metrics: [
      { label: 'Nephrons', value: '~1.0M each' },
      { label: 'Combined GFR', value: '125 mL/min' },
      { label: 'Renal Blood', value: '20–25% CO' },
    ],
  },
  kidney_right: {
    id: 'kidney_right',
    organId: 'kidneys',
    name: 'Right Kidney',
    latinName: 'Ren Dexter',
    system: 'Renal',
    summary:
      'Positioned 1–2 cm lower than the left kidney beneath the right lobe of the liver.',
    function:
      'Produces erythropoietin (stimulating RBC synthesis) and activates vitamin D (calcitriol) alongside filtration.',
    clinicalNote:
      'Each kidney measures approximately 11 cm long, 6 cm wide, and 3 cm thick.',
    metrics: [
      { label: 'Dimensions', value: '11 × 6 × 3 cm' },
      { label: 'Mass', value: '135–150 g' },
      { label: 'Filtrate/Day', value: '~180 L' },
    ],
  },
  adrenal_glands: {
    id: 'adrenal_glands',
    organId: 'kidneys',
    name: 'Adrenal (Suprarenal) Glands',
    latinName: 'Glandulae Suprarenales',
    system: 'Endocrine',
    summary:
      'Pyramidal endocrine glands resting atop the superior poles of both kidneys within the renal fascia.',
    function:
      'Outer cortex secretes cortisol and aldosterone; inner medulla releases epinephrine and norepinephrine.',
    clinicalNote:
      'Essential for stress response, vascular tone, and sodium-potassium balance.',
    metrics: [
      { label: 'Mass', value: '4–5 g each' },
      { label: 'Cortex Zones', value: '3 layers' },
      { label: 'Hormones', value: 'Cortisol / Epi' },
    ],
  },
  renal_vessels: {
    id: 'renal_vessels',
    organId: 'kidneys',
    name: 'Abdominal Aorta, IVC & Renal Pedicles',
    latinName: 'Vasa Renalia',
    system: 'Renal / Vascular',
    summary:
      'High-flow vascular trunks branching laterally from the aorta and inferior vena cava into each renal hilum.',
    function:
      'Delivers ~1.1 liters of blood per minute to the kidneys to maintain glomerular filtration pressure.',
    clinicalNote:
      'Renal artery stenosis can trigger secondary hypertension via renin-angiotensin-aldosterone activation.',
    metrics: [
      { label: 'Total Flow', value: '1.1 L/min' },
      { label: 'O₂ Difference', value: 'Low (1.4 mL)' },
      { label: 'Hilum Order', value: 'V-A-P (ant-post)' },
    ],
  },
  ureters: {
    id: 'ureters',
    organId: 'kidneys',
    name: 'Ureters',
    latinName: 'Ureteres',
    system: 'Renal',
    summary:
      'Narrow fibromuscular tubes descending retroperitoneally from each renal pelvis to the urinary bladder.',
    function:
      'Propels urine via rhythmic smooth-muscle peristalsis rather than gravity alone.',
    clinicalNote:
      'Three physiological constrictions (UPJ, pelvic brim, UVJ) are common sites for kidney stone impaction.',
    metrics: [
      { label: 'Length', value: '25–30 cm' },
      { label: 'Lumen Width', value: '3–4 mm' },
      { label: 'Peristalsis', value: '1–5 /min' },
    ],
  },
};
