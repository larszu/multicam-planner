/**
 * Phase 2 — Zentraler Bestand (siehe docs/inventory-rental-readiness.md).
 *
 * Ein `InventoryItem` ist ein **Lager-Artikel** (ein Modell mit Menge N) —
 * bewusst getrennt vom `EquipmentItem` (Plan-Instanz auf dem Canvas). Der
 * Bestand lebt projektübergreifend im `inventoryStore` (localStorage),
 * unabhängig vom gerade geöffneten Plan.
 *
 * Lager-Modul (projektübergreifende Codes, Maße, Cases): Anders als die
 * projektgebundenen QR-Codes auf Kabeln/Geräten (siehe `qrPayload.ts`) trägt
 * ein Lager-Artikel einen **festen** Code (QR ODER Barcode), der über alle
 * Projekte hinweg denselben Artikel meint (touring-tauglich).
 */

/** Eigentumsverhältnis — gleiche Werte wie `EquipmentItem.ownership`. */
export type InventoryOwnership = 'owned' | 'rented' | 'subhire'

/** Etiketten-Codeart eines Lager-Artikels/Cases. */
export type InventoryCodeType = 'qr' | 'barcode'

/**
 * Material-Art (orthogonal zum Eigentum): Vermietmaterial wird verliehen und
 * kommt zurück; Verbrauchsmaterial (Gaffa, Batterien, Kabelbinder) wird
 * aufgebraucht. Ein Artikel darf beides sein (z. B. Verbrauchs- UND
 * Vermietware in Mischkalkulation), daher eine Menge statt Enum.
 */
export type InventoryMaterialKind = 'rental' | 'consumable'

/** Physische Maße in mm + Gewicht in kg. Alle Felder optional (nichts erfinden). */
export interface PhysicalDimensions {
  widthMm?: number
  heightMm?: number
  depthMm?: number
  weightKg?: number
}

/**
 * Ein Geldbetrag — Betrag UND Waehrung, immer zusammen (Bedarf 118).
 *
 * OHNE WAEHRUNG KEIN BETRAG. Eine Zahl ohne Kuerzel ist in einer
 * Versicherungssumme nichts wert, und sie stillschweigend zu „EUR" zu erklaeren
 * waere eine Annahme ueber einen fremden Vertrag. Summiert wird je Waehrung
 * getrennt; ein Umrechnungskurs waere ein Wert ohne Fundstelle.
 *
 * GANZZAHLIG in der kleinsten Einheit — `0.1 + 0.2` ist in Fliesskomma nicht
 * `0.3`, und eine Versicherungssumme, die um Cent daneben liegt, ist eine Zahl,
 * der jemand widerspricht.
 *
 * DIE LISTEN DAZU STEHEN IM CABLE-PLANNER (`lager/lib/insuranceSchedule.ts`).
 * Hier stehen nur die FELDER — damit dieser Planer eine Datei mit
 * Versicherungswerten lesen und unveraendert zurueckschreiben kann, statt sie
 * still zu verlieren.
 */
export interface Geldbetrag {
  /** Betrag in der kleinsten Einheit der Waehrung (Cent, Penny, …). */
  cent: number;
  /** Waehrungskuerzel nach ISO 4217. ANGEGEBEN, nie geraten. */
  waehrung: string;
}

/** Was eine Einheit gekostet hat, und wann (Bedarf 118). */
export interface Anschaffung {
  betrag: Geldbetrag;
  /** Kaufdatum (ISO). */
  am?: string;
}

/**
 * Wofuer eine Einheit versichert ist, und mit welchem Stand (Bedarf 118).
 *
 * KEIN ZEITWERT. Anschaffungspreis und Versicherungswert werden nicht
 * auseinander gerechnet: nach welcher Regel abgeschrieben wird, entscheidet der
 * Versicherer, und diese Anwendung kennt seinen Vertrag nicht.
 */
export interface Versicherungswert {
  betrag: Geldbetrag;
  /** Stand des Werts (ISO-Datum). */
  stand?: string;
}

export interface InventoryItem {
  id: string
  /** Modell-/Artikelname (Pflicht, Anzeigename). */
  model: string
  /** Optionaler Hersteller. */
  manufacturer?: string
  /** Kategorie (gleiche Taxonomie wie `EquipmentItem.category`). */
  category?: string;
  /**
   * ADR-002 — stabile Geraetetyp-Identitaet, dieselbe GUID wie im Katalog des
   * cable-planners (`EquipmentItem.deviceTypeId`). Ist sie gesetzt, ist die
   * Zuordnung Plan-Geraet -> Lager-Position eine Tatsache statt eines
   * Namensvergleichs. Optional, weil ein Lager mehr enthaelt als der Katalog
   * kennt.
   */
  deviceTypeId?: string
  /** Gesamtmenge im Bestand. */
  quantity: number
  /**
   * Mindestmenge -- ab wann das Haus nachbestellt oder sub-hired (B-65).
   *
   * Gepflegt wird sie im Lager-Werkzeug (`inventory-planner`); dieser Planer
   * FUEHRT sie nur, damit eine Datei mit Mindestmengen hier durchlaeuft,
   * ohne sie zu verlieren -- dieselbe Rolle wie bei `ursprungsland` und den
   * Versicherungswerten aus Bedarf 118.
   *
   * Optional heisst UNBEWERTET und nicht 0: eine 0 waere die Aussage „darf
   * leer sein", und die trifft jemand ausdruecklich.
   */
  mindestmenge?: number
  /** Mietpreis pro Tag (Kalkulation, Phase 5). */
  rentPricePerDay?: number
  /** Lagerort (z. B. "Regal A3"). */
  stockLocation?: string
  /** Lieferant / Sub-Vermieter. */
  supplier?: string
  /** Eigentum (owned/rented/subhire). */
  ownership?: InventoryOwnership
  /**
   * Wann fremdes Material zurueckmuss (ISO-Datum, Bedarf 82).
   *
   * Der Bedarf zieht die Grenze selbst: „the achievable win is a flag on the
   * inventory unit, NOT A SUPPLIER PORTAL. […] mark ownership and return date
   * inside the job and stop there." Kein Bestellwesen — ein Datum.
   *
   * Und er sagt, warum: „the failure mode is not losing sub-hire gear, IT IS
   * KEEPING IT THREE WEEKS TOO LONG." Jeder Tag darueber ist eine weitere
   * Mietwoche.
   *
   * Ohne `ownership` ausser `owned` bedeutungslos.
   *
   * TEIL DES WIRE-CONTRACTS `avplan-inventory` und deshalb in ALLEN DREI Apps
   * identisch. Die Formatversion bleibt bei 2: ein hinzugefuegtes OPTIONALES
   * Feld ist in beide Richtungen vertraeglich (unbekannte Schluessel werden
   * beim Lesen ignoriert, ein fehlendes ist erlaubt). Eine 3 haette dagegen
   * jede aeltere App die Datei ABLEHNEN lassen — `parseInventory` verwirft
   * `f.version > INVENTORY_FORMAT_VERSION` —, und zwar so lange, bis alle
   * drei ausgeliefert sind.
   */
  returnDue?: string
  /** Fester Etiketten-Code (projektübergreifend). */
  code?: string
  /** Codeart des Etiketts (QR oder Barcode). */
  codeType?: InventoryCodeType
  /**
   * Aktueller Lagerort (Referenz auf `StorageNode.id`). Zeigt er auf einen
   * Container (case/transportCase), gilt der Artikel als DORT eingepackt —
   * „Case als Lagerort zuweisen" = einpacken. Kein separater Pack-Zustand:
   * die Zugehörigkeit ergibt sich allein aus dem Lager-Baum (LPN-Prinzip).
   */
  locationId?: string
  /** Physische Artikelmaße (für Case-Packing). */
  dimensions?: PhysicalDimensions
  /**
   * Ursprungsland nach ISO 3166-1 alpha-2 („DE", „JP") — Bedarf 118, fuer das
   * Carnet-Datenblatt im cable-planner. Am ARTIKEL, weil es eine Eigenschaft
   * des Modells ist.
   */
  ursprungsland?: string;
  /** Material-Art(en): Vermiet- und/oder Verbrauchsmaterial. */
  materialKinds?: InventoryMaterialKind[]
  /** Freie Notiz. */
  notes?: string
  /** ISO-Zeitstempel. */
  createdAt: string
  updatedAt: string
}

/** Ein in einem Case verpackter Artikel + Stückzahl. */
export interface CasePackedItem {
  /** Referenz auf `InventoryItem.id`. */
  itemId: string
  /** Anzahl dieses Artikels im Case. */
  quantity: number
}

/**
 * Ein Case/Flightcase, das Artikel aufnimmt. Trägt eigene (Außen-)Maße +
 * optionalen festen Code. Die verpackten Artikel referenzieren `InventoryItem`
 * über die id — die Artikelmaße liegen am Artikel, nicht dupliziert im Case.
 */
export interface InventoryCase {
  id: string
  /** Anzeigename (z. B. "Case 1 — Funkstrecken"). */
  name: string
  /** Außenmaße + Leergewicht des Cases. */
  dimensions?: PhysicalDimensions
  /** Fester Etiketten-Code des Cases. */
  code?: string
  codeType?: InventoryCodeType
  /** Lagerort des Cases. */
  stockLocation?: string
  /** Verpackte Artikel. */
  contents: CasePackedItem[]
  /** Freie Notiz. */
  notes?: string
  createdAt: string
  updatedAt: string
}

// ── LPN-Modell (License Plate Number) ────────────────────────────────────────
// Warehouse-Best-Practice: JEDE scanbare Einheit — Lagerplatz (Depot/Raum/
// Regal/Fach) UND Container (Case/Transport-Case) — ist derselbe Knotentyp im
// selben Baum. So löst sich alles aus dem Baum ab: „Case in Case in
// Transport-Case", „Artikel in Case einpacken" (= locationId auf Case-Knoten)
// und „effektiver Lagerort" (oberster Vorfahr). Quelle: LPN/Nested-LPN (WMS).

/** Art eines Lager-Knotens. `case`/`transportCase` sind Container. */
export type StorageNodeKind = 'depot' | 'room' | 'shelf' | 'bin' | 'case' | 'transportCase'

/** Container-Arten (können bewegt werden + Inhalt tragen). */
export const CONTAINER_KINDS: readonly StorageNodeKind[] = ['case', 'transportCase']

/** Ein Knoten im Lager-Baum: Lagerplatz ODER Container. */
export interface StorageNode {
  id: string
  /** Anzeigename (z. B. "Regal A3", "Transport-Case 1"). */
  name: string
  kind: StorageNodeKind
  /**
   * Übergeordneter Knoten. Lagerplatz-Baum (Depot → Raum → Regal → Fach) und
   * Container-Verschachtelung (Case in Case in Transport-Case) nutzen dasselbe
   * Feld. Wurzelknoten haben keinen Parent.
   */
  parentId?: string
  /** Fester Etiketten-Code — Lagerplätze UND Cases sind scanbar. */
  code?: string
  codeType?: InventoryCodeType
  /** Außenmaße + Leergewicht (v. a. für Container). */
  dimensions?: PhysicalDimensions
  /** Freie Notiz. */
  notes?: string
  createdAt: string
  updatedAt: string
}

/** Eine Komponente eines logischen Sets (Artikel + Stückzahl). */
export interface SetComponent {
  itemId: string
  quantity: number
}

/**
 * Logisches Set/Kit (Vorlage) — „diese Artikel gehören zusammen". Anders als
 * ein Container (physische Kiste) ist ein Set eine Zusammenstellung; seine
 * Verfügbarkeit ergibt sich aus der knappsten Komponente (HireHop Virtual
 * Stock / Cheqroom Kits).
 */
export interface InventorySet {
  id: string
  name: string
  components: SetComponent[]
  notes?: string
  createdAt: string
  updatedAt: string
}

// ── Serialisierung (Einzel-Units mit Historie) ───────────────────────────────
// Rentmans meistgewünschter Fix: neben dem Bulk-Modell (Artikel mit Menge N)
// die EINZELNE physische Einheit — eigene Seriennr./Code, eigener Lagerort,
// eigener Zustand + Historie (wo war sie, wann repariert). Ein Unit gehört zu
// genau einem `InventoryItem` (Modell).

/** Zustand einer Einzel-Einheit. */
export type UnitCondition = 'ok' | 'defect' | 'inRepair' | 'retired'

/** Ereignis-Typ in der Unit-Historie. */
export type UnitEventKind = 'created' | 'moved' | 'condition' | 'note'

/** Ein Eintrag in der Historie einer Einheit (append-only). */
export interface UnitEvent {
  /** ISO-Zeitstempel. */
  at: string
  kind: UnitEventKind
  /** Menschlich lesbare Beschreibung (z. B. „nach Case 2", „defekt → Reparatur"). */
  detail: string
}

/** Eine serialisierte Einzel-Einheit eines Artikel-Modells. */
export interface InventoryUnit {
  id: string
  /** Referenz auf das Artikel-Modell (`InventoryItem.id`). */
  itemId: string
  /**
   * Die HERSTELLER-Seriennummer.
   *
   * Bedarf 107 — das Feld hiess „Hersteller ODER intern", und genau das ist
   * der Defekt: ein Feld fuer zwei Identitaeten zwingt das Lager zur Wahl,
   * und die andere landet mit Filzstift auf dem Case. Gebraucht werden beide,
   * von verschiedenen Leuten: die Herstellernummer fuer Versicherung,
   * Sub-Vermietung und Wartung, die Hausnummer fuer alles Interne.
   */
  serial?: string;
  /**
   * Die HAUS-EIGENE Referenz („AV-0421") — die Nummer, unter der dieses Haus
   * die Einheit fuehrt. Steht NEBEN `serial` und nicht statt ihr; ein
   * Altbestand, in dem die Hausnummer im `serial`-Feld steht, wird NICHT
   * automatisch umgeraeumt.
   */
  houseRef?: string;
  /** Fester Etiketten-Code der Einheit. */
  code?: string
  codeType?: InventoryCodeType
  /** Aktueller Lagerort (Referenz auf `StorageNode.id`) — wie beim Artikel. */
  locationId?: string
  /** Zustand (Wartung/Reparatur). */
  condition: UnitCondition
  /** Bedarf 118 — was sie gekostet hat. Siehe `Anschaffung`. */
  anschaffung?: Anschaffung;
  /** Bedarf 118 — wofuer sie versichert ist. Siehe `Versicherungswert`. */
  versicherungswert?: Versicherungswert;
  /** Freie Notiz. */
  notes?: string
  /** Append-only Historie (Bewegungen, Zustandswechsel). */
  history: UnitEvent[]
  createdAt: string
  updatedAt: string
}
