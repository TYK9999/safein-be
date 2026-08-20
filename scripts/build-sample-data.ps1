$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$outPath = 'c:\Users\YaswanthK\Desktop\safein5-be\docs\SafeIn5-MVP-Sample-Data.xlsx'
$altPath = 'c:\Users\YaswanthK\Desktop\safein5-be\docs\SafeIn5-MVP-Sample-Data-v2.xlsx'
$tmp = 'c:\Users\YaswanthK\Desktop\safein5-be\_sample_xlsx_build'
if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
$xl = Join-Path $tmp 'xl'
New-Item -ItemType Directory -Path (Join-Path $xl 'worksheets') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $tmp '_rels') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $xl '_rels') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $tmp 'docProps') -Force | Out-Null

function Esc([string]$s) {
  if ($null -eq $s) { return '' }
  return ($s -replace '&', '&amp;' -replace '<', '&lt;' -replace '>', '&gt;' -replace '"', '&quot;')
}

$allStrings = New-Object System.Collections.Generic.List[string]
$strIndex = @{}
function S([string]$t) {
  if ($null -eq $t) { $t = '' }
  if (-not $strIndex.ContainsKey($t)) {
    $strIndex[$t] = $allStrings.Count
    [void]$allStrings.Add($t)
  }
  return [int]$strIndex[$t]
}

function ColLetter([int]$c) {
  $colLetter = ''
  $n = $c
  do {
    $colLetter = [char]([int][char]'A' + ($n % 26)) + $colLetter
    $n = [math]::Floor($n / 26) - 1
  } while ($n -ge 0)
  return $colLetter
}

function New-SheetXml($rows) {
  $colCount = 0
  foreach ($row in $rows) { if ($row.Count -gt $colCount) { $colCount = $row.Count } }

  # Estimate readable widths from content (Excel width units ~ character count)
  $maxLens = @(0) * $colCount
  foreach ($row in $rows) {
    for ($c = 0; $c -lt $row.Count; $c++) {
      $len = ([string]$row[$c]).Length
      if ($len -gt $maxLens[$c]) { $maxLens[$c] = $len }
    }
  }

  $sb = New-Object System.Text.StringBuilder
  [void]$sb.Append('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>')
  [void]$sb.Append('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">')
  [void]$sb.Append('<cols>')
  for ($c = 0; $c -lt $colCount; $c++) {
    $n = $c + 1
    # Wider defaults for readability; cap long prompt/card columns
    $w = [math]::Max(18, [math]::Min(56, [math]::Ceiling($maxLens[$c] * 1.15) + 4))
    [void]$sb.Append("<col min=`"$n`" max=`"$n`" width=`"$w`" customWidth=`"1`"/>")
  }
  [void]$sb.Append('</cols>')
  [void]$sb.Append('<sheetData>')
  for ($r = 0; $r -lt $rows.Count; $r++) {
    $rowNum = $r + 1
    [void]$sb.Append("<row r=`"$rowNum`">")
    $cols = $rows[$r]
    for ($c = 0; $c -lt $cols.Count; $c++) {
      $idx = S ([string]$cols[$c])
      $ref = "$(ColLetter $c)$rowNum"
      [void]$sb.Append("<c r=`"$ref`" t=`"s`"><v>$idx</v></c>")
    }
    [void]$sb.Append('</row>')
  }
  [void]$sb.Append('</sheetData></worksheet>')
  return $sb.ToString()
}

function Add-Rules($list, $site, $rules) {
  foreach ($r in $rules) { [void]$list.Add(@($site) + $r) }
}

# RIG Systems - heavy lift / rigging & fixtures pilot
$tenants = @(
  , @('Organisation Name', 'Live Since', 'Administrator Name', 'Administrator Email', 'Status')
  , @('RIG Systems', '15 April 2026', 'Marcus Bell', 'marcus.bell@rigsystems.co.uk', 'Live')
  , @('Coastal Lift Partners', '(invite sent 6 Aug 2026)', 'Nina Forsyth', 'nina.forsyth@coastallift.co.uk', 'Invited')
)

$sites = @(
  , @('Site Name', 'Site in-charge', 'Default Supervisor', 'Require Review Before Sharing Needs Attention Now on High Energy (Yes / No)')
  , @('Brackley Fabrication Yard', 'Sarah Quinn', 'Pete Marsh', 'Yes')
  , @('Teesside Shutdown Pad', 'Marcus Bell', 'Imran Shah', 'Yes')
  , @('Offshore Prep Bay', 'Sarah Quinn', 'Callum Reid', 'No')
  , @('Grangemouth Quayside', 'Olivia Grant', 'Noah Price', 'Yes')
  , @('Aberdeen Bundle Yard', 'Olivia Grant', 'Freya Hughes', 'Yes')
  , @('Workshop South', 'Sarah Quinn', 'Callum Reid', 'No')
)

# Hazard categories — exact wording from index.html. Build 12 rules per site.
$routing = New-Object System.Collections.Generic.List[object]
[void]$routing.Add(@('Site Name', 'Hazard Category', 'Energy (High energy / Standard)', 'Owner Role', 'Named Owner', 'Review If Needs Attention Now (Site in-charge / Not needed)'))

function Get-SiteRules($supervisor, $siteInCharge, $ehsLead, $reviewOn) {
  $reviewHe = if ($reviewOn) { 'Site in-charge' } else { 'Not needed' }
  return @(
    @('Working at height', 'High energy', 'Supervisor', $supervisor, $reviewHe),
    @('Confined space', 'High energy', 'Supervisor', $supervisor, $reviewHe),
    @('Mobile plant and vehicles', 'High energy', 'Site in-charge', $siteInCharge, $reviewHe),
    @('Lifting operations', 'High energy', 'Supervisor', $supervisor, $reviewHe),
    @('Electrical / energy isolation', 'High energy', 'EHS lead', $ehsLead, $reviewHe),
    @('Mechanical / moving machinery', 'High energy', 'Supervisor', $supervisor, $reviewHe),
    @('Slips, trips and falls', 'Standard', 'Supervisor', $supervisor, 'Not needed'),
    @('Manual handling', 'Standard', 'Supervisor', $supervisor, 'Not needed'),
    @('Housekeeping / environment', 'Standard', 'Supervisor', $supervisor, 'Not needed'),
    @('PPE and equipment', 'Standard', 'Supervisor', $supervisor, 'Not needed'),
    @('Tools and machinery condition', 'Standard', 'Supervisor', $supervisor, 'Not needed'),
    @('Environmental / weather', 'Standard', 'Site in-charge', $siteInCharge, 'Not needed')
  )
}

Add-Rules $routing 'Brackley Fabrication Yard' (Get-SiteRules 'Pete Marsh' 'Sarah Quinn' 'Marcus Bell' $true)
Add-Rules $routing 'Teesside Shutdown Pad' (Get-SiteRules 'Imran Shah' 'Marcus Bell' 'Marcus Bell' $true)
Add-Rules $routing 'Offshore Prep Bay' (Get-SiteRules 'Callum Reid' 'Sarah Quinn' 'Marcus Bell' $false)
Add-Rules $routing 'Grangemouth Quayside' (Get-SiteRules 'Noah Price' 'Olivia Grant' 'Marcus Bell' $true)
Add-Rules $routing 'Aberdeen Bundle Yard' (Get-SiteRules 'Freya Hughes' 'Olivia Grant' 'Marcus Bell' $true)
Add-Rules $routing 'Workshop South' (Get-SiteRules 'Callum Reid' 'Sarah Quinn' 'Marcus Bell' $false)

# Task types: Confined space entry | Grinding and dressing | Access route | Vehicle marshalling | Lifting operation
$spaces = @(
  , @('Space Name', 'Location', 'QR Code ID', 'Task Type', 'Permit Required (Yes / No)', 'Content Owner', 'Take 5 Version', 'Learn 5 Version (or None)')
  , @('Lifting Zone 3', 'Brackley Fabrication Yard - north bay barrier', 'RIG-QR-LZ3-01', 'Lifting operation', 'Yes', 'Marcus Bell (EHS)', 'v2', 'v2')
  , @('Spreader Beam SB-14 laydown', 'Brackley Fabrication Yard - fixture rack B', 'RIG-QR-SB14', 'Lifting operation', 'Yes', 'Marcus Bell (EHS)', 'v2', 'v2')
  , @('Chain store aisle', 'Brackley Fabrication Yard - tackle store', 'RIG-QR-CS-04', 'Access route', 'No', 'Sarah Quinn (Site)', 'v1', 'v1')
  , @('Fixture paint booth', 'Brackley Fabrication Yard - booth 2', 'RIG-QR-PB-02', 'Grinding and dressing', 'No', 'Sarah Quinn (Site)', 'v1', 'None')
  , @('Crane pad Alpha', 'Teesside Shutdown Pad - unit 7 approach', 'RIG-QR-CPA-02', 'Lifting operation', 'Yes', 'Marcus Bell (EHS)', 'v1', 'None')
  , @('Vessel manway V-12', 'Teesside Shutdown Pad - column deck', 'RIG-QR-VM-12', 'Confined space entry', 'Yes', 'Marcus Bell (EHS)', 'v1', 'v1')
  , @('Unit 7 pipe rack walk', 'Teesside Shutdown Pad - elevated rack', 'RIG-QR-PR-07', 'Access route', 'No', 'Imran Shah (Site)', 'v1', 'None')
  , @('Module skid lane', 'Offshore Prep Bay - west trailers', 'RIG-QR-MSK-03', 'Vehicle marshalling', 'No', 'Sarah Quinn (Site)', 'v1', 'v1')
  , @('Load-out quay face', 'Grangemouth Quayside - berth 2', 'RIG-QR-LQ-02', 'Lifting operation', 'Yes', 'Olivia Grant (Site)', 'v1', 'v1')
  , @('Berth approach lane', 'Grangemouth Quayside - gate to berth', 'RIG-QR-BA-01', 'Vehicle marshalling', 'No', 'Olivia Grant (Site)', 'v1', 'None')
  , @('Bundle laydown grid C', 'Aberdeen Bundle Yard - grid C', 'RIG-QR-BL-0C', 'Lifting operation', 'Yes', 'Olivia Grant (Site)', 'v1', 'None')
  , @('Pipe end prep bay', 'Aberdeen Bundle Yard - bay 4', 'RIG-QR-PE-04', 'Grinding and dressing', 'No', 'Freya Hughes (Site)', 'v1', 'v1')
  , @('Workshop grind bay', 'Workshop South - east benches', 'RIG-QR-WG-01', 'Grinding and dressing', 'No', 'Callum Reid (Site)', 'v2', 'v1')
  , @('Workshop yard gate', 'Workshop South - vehicle gate', 'RIG-QR-WY-01', 'Vehicle marshalling', 'No', 'Callum Reid (Site)', 'v1', 'None')
)

# Role on site: Community worker | Operative | Supervisor | Site in-charge | EHS lead
# Back office access: Phone only | Supervisor | Tenant admin
$users = @(
  , @('Name', 'Role On Site', 'Email or Mobile', 'Site', 'Back Office Access (Phone only / Supervisor / Tenant admin)', 'Can Be Assigned (Yes / No)')
  , @('Marcus Bell', 'EHS lead', 'marcus.bell@rigsystems.co.uk', 'All sites', 'Tenant admin', 'Yes')
  , @('Sarah Quinn', 'Site in-charge', 'sarah.quinn@rigsystems.co.uk', 'Brackley Fabrication Yard; Offshore Prep Bay; Workshop South', 'Supervisor', 'Yes')
  , @('Olivia Grant', 'Site in-charge', 'olivia.grant@rigsystems.co.uk', 'Grangemouth Quayside; Aberdeen Bundle Yard', 'Supervisor', 'Yes')
  , @('Pete Marsh', 'Supervisor', 'pete.marsh@rigsystems.co.uk', 'Brackley Fabrication Yard', 'Supervisor', 'Yes')
  , @('Imran Shah', 'Supervisor', 'imran.shah@rigsystems.co.uk', 'Teesside Shutdown Pad', 'Supervisor', 'Yes')
  , @('Callum Reid', 'Supervisor', 'callum.reid@rigsystems.co.uk', 'Offshore Prep Bay; Workshop South', 'Supervisor', 'Yes')
  , @('Noah Price', 'Supervisor', 'noah.price@rigsystems.co.uk', 'Grangemouth Quayside', 'Supervisor', 'Yes')
  , @('Freya Hughes', 'Supervisor', 'freya.hughes@rigsystems.co.uk', 'Aberdeen Bundle Yard', 'Supervisor', 'Yes')
  , @('Dave Nolan', 'Operative', 'dave.nolan@rigsystems.co.uk', 'Brackley Fabrication Yard', 'Phone only', 'No')
  , @('Kirsty Webb', 'Operative', 'kirsty.webb@rigsystems.co.uk', 'Brackley Fabrication Yard', 'Phone only', 'No')
  , @('Jon Walsh', 'Operative', 'jon.walsh@rigsystems.co.uk', 'Brackley Fabrication Yard', 'Phone only', 'No')
  , @('Tom Adeyemi', 'Operative', 'tom.adeyemi@rigsystems.co.uk', 'Teesside Shutdown Pad', 'Phone only', 'No')
  , @('Elena Petrova', 'Operative', 'elena.petrova@rigsystems.co.uk', 'Teesside Shutdown Pad', 'Phone only', 'No')
  , @('Mark Doyle', 'Operative', 'mark.doyle@rigsystems.co.uk', 'Offshore Prep Bay', 'Phone only', 'No')
  , @('Priya Desai', 'Operative', 'priya.desai@rigsystems.co.uk', 'Grangemouth Quayside', 'Phone only', 'No')
  , @('Sam Okeke', 'Operative', 'sam.okeke@rigsystems.co.uk', 'Aberdeen Bundle Yard', 'Phone only', 'No')
  , @('Amy Fraser', 'Operative', 'amy.fraser@rigsystems.co.uk', 'Workshop South', 'Phone only', 'No')
  , @('Luis Ortega', 'Community worker', '07700 902188', 'Brackley Fabrication Yard', 'Phone only', 'No')
  , @('Hannah Croft', 'Community worker', 'hannah.croft@apexscaffold.uk', 'Teesside Shutdown Pad', 'Phone only', 'No')
  , @('Greg Munro', 'Community worker', '07700 903441', 'Grangemouth Quayside', 'Phone only', 'No')
  , @('Yasmin Ali', 'Community worker', 'yasmin.ali@northsea-crew.co.uk', 'Aberdeen Bundle Yard', 'Phone only', 'No')
  , @('Chris Vaughan', 'Community worker', '07700 904012', 'Offshore Prep Bay', 'Phone only', 'No')
)

$take5List = @(
  , @('Take 5 Template Name', 'Task Type', 'Space Name', 'Version', 'Last Edited By')
  , @('Heavy lift - zone entry', 'Lifting operation', 'Lifting Zone 3', 'v2', 'Marcus Bell')
  , @('Custom spreader set-up', 'Lifting operation', 'Spreader Beam SB-14 laydown', 'v2', 'Marcus Bell')
  , @('Tackle store walk', 'Access route', 'Chain store aisle', 'v1', 'Sarah Quinn')
  , @('Pad approach traffic', 'Vehicle marshalling', 'Module skid lane', 'v1', 'Sarah Quinn')
  , @('Vessel manway entry', 'Confined space entry', 'Vessel manway V-12', 'v1', 'Marcus Bell')
  , @('Fixture dress and grind', 'Grinding and dressing', 'Fixture paint booth', 'v1', 'Sarah Quinn')
  , @('Quay load-out checks', 'Lifting operation', 'Load-out quay face', 'v1', 'Olivia Grant')
  , @('Workshop grind start-up', 'Grinding and dressing', 'Workshop grind bay', 'v2', 'Callum Reid')
)

$take5Detail = @(
  , @('Name', 'Task Type', 'Prompt 1', 'Prompt 2', 'Prompt 3', 'Prompt 4', 'Prompt 5', 'Last Edited By', 'Version')
  , @(
    'Heavy lift - zone entry',
    'Lifting operation',
    'Stop at the barrier - has anything changed in the lift plan since the brief?',
    'Is the exclusion zone clear of people and parked plant?',
    'Are tag lines positioned so nobody stands in a pinch or crush zone?',
    'Do shackle pins and orientation match the lift plan drawing?',
    'Is the crane window still open for this lift?',
    'Marcus Bell',
    'v2'
  )
  , @(
    'Custom spreader set-up',
    'Lifting operation',
    'Is SB-14 the beam listed on today lift sheet?',
    'Are sling angles inside the rated range for this fixture weight?',
    'Any side-loading risk on shackles or master links?',
    'Are soft packers or edge protection in place where steel meets chain?',
    'Would you start this lift if the next crew had to finish it for you?',
    'Marcus Bell',
    'v2'
  )
  , @(
    'Tackle store walk',
    'Access route',
    'Is the aisle clear so you can pull tackle without stepping over coils?',
    'Are WLL tags readable on the slings and shackles you are taking?',
    'Any damaged chain or missing safety catches in the selection?',
    'Is lighting adequate to check pin threads before you leave the store?',
    'Anything different about this fixture job compared with the last identical set-up?',
    'Sarah Quinn',
    'v1'
  )
  , @(
    'Pad approach traffic',
    'Vehicle marshalling',
    'Is a banksman in place before any trailer reverses into the skid lane?',
    'Are pedestrian routes clear of outriggers and counterweight swing?',
    'Load secure and within the vehicle rating for site roads?',
    'Any change to the crane or trailer sequence today?',
    'Radio check done before the first reverse?',
    'Sarah Quinn',
    'v1'
  )
)

# Learn 5 task types from index.html content library: Confined space | General | Lifting and mobile plant | Working at height
$learn5List = @(
  , @('Learn 5 Set Name', 'Task Type', 'Version', 'Has Rescue Plan (Yes / No)')
  , @('Suspended loads and pinch points', 'Lifting and mobile plant', 'v2', 'Yes')
  , @('Shackle orientation basics', 'Lifting and mobile plant', 'v1', 'No')
  , @('Tag line discipline', 'Lifting and mobile plant', 'v1', 'No')
)

$learn5Detail = @(
  , @('Set Name', 'Task Type', 'Card 1', 'Card 2', 'Card 3', 'Card 4', 'Card 5', 'Rescue Plan Step 1', 'Rescue Plan Step 2', 'Rescue Plan Step 3', 'Version')
  , @(
    'Suspended loads and pinch points',
    'Lifting and mobile plant',
    'If you can be hit by the load path, you are already in the wrong place.',
    'Never walk under a suspended load to save time.',
    'Pinch points hide at tag lines, packers and fixture corners.',
    'If the plan on the radio does not match what you see, stop the lift.',
    'A delayed crane window is cheaper than a struck-by injury.',
    'Sound the yard alarm and clear the exclusion zone. Do not approach the load.',
    'Crane to hold or lower under banksman control only - no improvised recovery.',
    'Muster at the north welfare cabin. Call site emergency on channel 1.',
    'v2'
  )
  , @(
    'Shackle orientation basics',
    'Lifting and mobile plant',
    'Incorrect shackle loading can create side-loading failure.',
    'Pin threads must be fully engaged and collar tight before load.',
    'Bow and pin must match the geometry on the lift drawing.',
    'If a shackle looks odd compared with the last identical set-up, pause.',
    'Sharing a photo of a doubtful set-up protects the next crew.',
    '',
    '',
    '',
    'v1'
  )
  , @(
    'Tag line discipline',
    'Lifting and mobile plant',
    'Tag lines steer the load - they are not a place to lean in.',
    'Keep feet clear of coils that can tighten under load.',
    'One voice for the lift - banksman owns the call.',
    'If wind swings the load toward people, lower and reset.',
    'Good practice is repositioning a tag line before the hook takes weight.',
    '',
    '',
    '',
    'v1'
  )
)

$jobs = @(
  , @('Job Reference', 'Work Description', 'Space Name', 'Site Name', 'Trigger Type', 'Owner', 'Start Date', 'Permit Required (Yes / No)', 'Permit Valid To')
  , @('LIFT-2408-17', 'Heavy fixture lift - custom spreader SB-14', 'Lifting Zone 3', 'Brackley Fabrication Yard', 'Task PULSE - QR', 'Pete Marsh', '12 Aug 2026', 'Yes', '12 Aug 2026 16:30')
  , @('LIFT-2408-09', 'Module skid move to trailer', 'Module skid lane', 'Offshore Prep Bay', 'Task PULSE - QR', 'Callum Reid', '11 Aug 2026', 'No', '')
  , @('PTW-V12-08', 'Internal inspection - vessel manway V-12', 'Vessel manway V-12', 'Teesside Shutdown Pad', 'Task PULSE - QR', 'Imran Shah', '12 Aug 2026', 'Yes', '12 Aug 2026 20:00')
  , @('LIFT-GQ-441', 'Load-out lift at berth 2', 'Load-out quay face', 'Grangemouth Quayside', 'Task PULSE - QR', 'Noah Price', '13 Aug 2026', 'Yes', '13 Aug 2026 17:00')
  , @('WO-AB-118', 'Pipe end prep - grid C bundles', 'Pipe end prep bay', 'Aberdeen Bundle Yard', 'Task PULSE - QR', 'Freya Hughes', '12 Aug 2026', 'No', '')
  , @('OBS-LZ3-Shackle', 'Observation - shackle orientation before lift', 'Spreader Beam SB-14 laydown', 'Brackley Fabrication Yard', 'Observation PULSE', 'Unassigned', '12 Aug 2026', 'No', '')
  , @('LIFT-2407-22', 'Fixture lift - previous SB-14 job (closed)', 'Lifting Zone 3', 'Brackley Fabrication Yard', 'Task PULSE - QR', 'Pete Marsh', '29 Jul 2026', 'Yes', '29 Jul 2026 15:00')
)

$readme = @(
  , @('About this workbook')
  , @('Sample data for SafeIn5 MVP using the RIG Systems use case: heavy lift, custom fixtures, spreader beams and rigging crews.')
  , @('Organisation: RIG Systems. Sites cover fabrication yard, shutdown pad and offshore prep - the environments in the Rigging and Fixtures scenario.')
  , @('Columns match Data fields in Core-latest.xlsx. Replace with real pilot details when the client provides them.')
  , @('Reference lists (from product UI / index.html): Hazard categories x12; Role on site = Community worker | Operative | Supervisor | Site in-charge | EHS lead; Back office = Phone only | Supervisor | Tenant admin; Space task type = Confined space entry | Grinding and dressing | Access route | Vehicle marshalling | Lifting operation; Learn 5 task type = Confined space | General | Lifting and mobile plant | Working at height.')
  , @('Suggested walkthrough: Dave Nolan (Operative) scans Lifting Zone 3 (RIG-QR-LZ3-01) before a critical fixture lift, completes Take 5, notices unusual shackle orientation on SB-14, shares Be Aware with a photo. Pete Marsh (Supervisor) acknowledges. Sarah Quinn (Site in-charge) sees the trend on Lifting operations.')
)

$sheets = [ordered]@{
  'Read me'          = $readme
  '1 Tenants'        = $tenants
  '2 Sites'          = $sites
  '3 Routing rules'  = @($routing.ToArray())
  '4 Spaces and QR'  = $spaces
  '5 Users'          = $users
  '6 Take 5 list'    = $take5List
  '7 Take 5 prompts' = $take5Detail
  '8 Learn 5 list'   = $learn5List
  '9 Learn 5 cards'  = $learn5Detail
  '10 Jobs'          = $jobs
}

$sheetXmls = @{}
foreach ($name in $sheets.Keys) {
  $sheetXmls[$name] = New-SheetXml $sheets[$name]
}

$utf8 = New-Object System.Text.UTF8Encoding $false
$ss = New-Object System.Text.StringBuilder
[void]$ss.Append('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>')
[void]$ss.Append("<sst xmlns=`"http://schemas.openxmlformats.org/spreadsheetml/2006/main`" count=`"$($allStrings.Count)`" uniqueCount=`"$($allStrings.Count)`">")
foreach ($t in $allStrings) {
  [void]$ss.Append('<si><t>')
  [void]$ss.Append((Esc $t))
  [void]$ss.Append('</t></si>')
}
[void]$ss.Append('</sst>')
[System.IO.File]::WriteAllText((Join-Path $xl 'sharedStrings.xml'), $ss.ToString(), $utf8)

$wb = New-Object System.Text.StringBuilder
$wbRels = New-Object System.Text.StringBuilder
[void]$wb.Append('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>')
[void]$wb.Append('<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>')
[void]$wbRels.Append('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>')
[void]$wbRels.Append('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">')
$sheetId = 1
foreach ($name in $sheets.Keys) {
  $file = "sheet$sheetId.xml"
  [System.IO.File]::WriteAllText((Join-Path $xl "worksheets\$file"), $sheetXmls[$name], $utf8)
  [void]$wb.Append("<sheet name=`"$(Esc $name)`" sheetId=`"$sheetId`" r:id=`"rId$sheetId`"/>")
  [void]$wbRels.Append("<Relationship Id=`"rId$sheetId`" Type=`"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet`" Target=`"worksheets/$file`"/>")
  $sheetId++
}
$ssRid = $sheetId
[void]$wbRels.Append("<Relationship Id=`"rId$ssRid`" Type=`"http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings`" Target=`"sharedStrings.xml`"/>")
[void]$wbRels.Append("<Relationship Id=`"rId$($ssRid+1)`" Type=`"http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles`" Target=`"styles.xml`"/>")
[void]$wb.Append('</sheets></workbook>')
[void]$wbRels.Append('</Relationships>')
[System.IO.File]::WriteAllText((Join-Path $xl 'workbook.xml'), $wb.ToString(), $utf8)
[System.IO.File]::WriteAllText((Join-Path $xl '_rels\workbook.xml.rels'), $wbRels.ToString(), $utf8)
[System.IO.File]::WriteAllText((Join-Path $xl 'styles.xml'), '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="1"><xf/></cellXfs></styleSheet>', $utf8)

$ct = New-Object System.Text.StringBuilder
[void]$ct.Append('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>')
[void]$ct.Append('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">')
[void]$ct.Append('<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>')
[void]$ct.Append('<Default Extension="xml" ContentType="application/xml"/>')
[void]$ct.Append('<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>')
[void]$ct.Append('<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>')
[void]$ct.Append('<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>')
[void]$ct.Append('<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>')
[void]$ct.Append('<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>')
for ($n = 1; $n -lt $sheetId; $n++) {
  [void]$ct.Append("<Override PartName=`"/xl/worksheets/sheet$n.xml`" ContentType=`"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml`"/>")
}
[void]$ct.Append('</Types>')
[System.IO.File]::WriteAllText((Join-Path $tmp '[Content_Types].xml'), $ct.ToString(), $utf8)
[System.IO.File]::WriteAllText((Join-Path $tmp '_rels\.rels'), '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>', $utf8)
[System.IO.File]::WriteAllText((Join-Path $tmp 'docProps\core.xml'), '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>SafeIn5 MVP Sample Data - RIG Systems</dc:title><dc:creator>SafeIn5</dc:creator></cp:coreProperties>', $utf8)
[System.IO.File]::WriteAllText((Join-Path $tmp 'docProps\app.xml'), '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>SafeIn5</Application></Properties>', $utf8)

$target = $outPath
try {
  if (Test-Path $outPath) {
    $fs = [System.IO.File]::Open($outPath, 'Open', 'ReadWrite', 'None')
    $fs.Close()
    Remove-Item $outPath -Force
  }
} catch {
  $target = $altPath
  if (Test-Path $target) { Remove-Item $target -Force }
  Write-Host "Primary file locked - writing $target"
}
$zip = [System.IO.Compression.ZipFile]::Open($target, 'Create')
function Add-FileToZip($zipArch, $fullPath, $entryName) {
  [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zipArch, $fullPath, $entryName.Replace('\', '/'), [System.IO.Compression.CompressionLevel]::Optimal)
}
Add-FileToZip $zip (Join-Path $tmp '[Content_Types].xml') '[Content_Types].xml'
Add-FileToZip $zip (Join-Path $tmp '_rels\.rels') '_rels/.rels'
Add-FileToZip $zip (Join-Path $tmp 'docProps\core.xml') 'docProps/core.xml'
Add-FileToZip $zip (Join-Path $tmp 'docProps\app.xml') 'docProps/app.xml'
Add-FileToZip $zip (Join-Path $xl 'workbook.xml') 'xl/workbook.xml'
Add-FileToZip $zip (Join-Path $xl 'styles.xml') 'xl/styles.xml'
Add-FileToZip $zip (Join-Path $xl 'sharedStrings.xml') 'xl/sharedStrings.xml'
Add-FileToZip $zip (Join-Path $xl '_rels\workbook.xml.rels') 'xl/_rels/workbook.xml.rels'
for ($n = 1; $n -lt $sheetId; $n++) {
  Add-FileToZip $zip (Join-Path $xl "worksheets\sheet$n.xml") "xl/worksheets/sheet$n.xml"
}
$zip.Dispose()
Remove-Item $tmp -Recurse -Force
Write-Host "Created $target ($((Get-Item $target).Length) bytes)"
