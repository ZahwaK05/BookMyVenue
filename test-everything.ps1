# ===== BookMyVenue end-to-end API test =====
$ErrorActionPreference = 'Stop'
$Base = 'http://localhost:5000'
$script:Passed = 0
$script:Failed = 0
$script:OtpTested = $false

function Api {
  param([string]$Method, [string]$Path, $Body = $null, [string]$Token = $null)
  $headers = @{}
  if ($Token) { $headers['Authorization'] = "Bearer $Token" }
  $p = @{ Uri = "$Base$Path"; Method = $Method; Headers = $headers; UseBasicParsing = $true }
  if ($null -ne $Body) {
    $p.Body = ($Body | ConvertTo-Json -Depth 6)
    $p.ContentType = 'application/json'
  }
  $status = 0; $text = ''
  try {
    $r = Invoke-WebRequest @p
    $status = [int]$r.StatusCode
    $text = $r.Content
  } catch {
    if ($_.Exception.Response) {
      $status = [int]$_.Exception.Response.StatusCode
      if ($_.ErrorDetails) { $text = $_.ErrorDetails.Message }
    } else {
      return [pscustomobject]@{ Status = 0; Data = $null }
    }
  }
  $data = $null
  if ($text) { try { $data = $text | ConvertFrom-Json } catch { $data = $text } }
  return [pscustomobject]@{ Status = $status; Data = $data }
}

function Check {
  param([string]$Name, [bool]$Ok, [string]$Detail = '')
  if ($Ok) { $script:Passed++; Write-Host "  PASS  $Name" -ForegroundColor Green }
  else { $script:Failed++; Write-Host "  FAIL  $Name   $Detail" -ForegroundColor Red }
}
function Info($m) { Write-Host "  INFO  $m" -ForegroundColor Yellow }
function Section($t) { Write-Host "`n== $t ==" -ForegroundColor Cyan }

function Get-Session {
  param($U)
  $r = Api POST '/auth/login' @{ email = $U.Email; password = $U.Password }
  if ($r.Status -eq 200) { Info "$($U.Email): existing account, logged in"; return $r.Data }

  Info "$($U.Email): creating account through the OTP flow"
  $req = Api POST '/auth/signup/request' @{ name = $U.Name; email = $U.Email; password = $U.Password; role = $U.Role }
  if ($req.Status -ne 200) {
    Check "Signup request for $($U.Email)" $false "status $($req.Status) $($req.Data.error)"
    return $null
  }
  if (-not $script:OtpTested) {
    $script:OtpTested = $true
    $rs = Api POST '/auth/signup/resend' @{ email = $U.Email }
    Check 'Resend inside 30 seconds is blocked (429)' ($rs.Status -eq 429) "got $($rs.Status)"
    $bad = Api POST '/auth/signup/verify' @{ email = $U.Email; otp = '000000' }
    Check 'Wrong OTP is rejected (400)' ($bad.Status -eq 400) "got $($bad.Status)"
  }
  $code = Read-Host "  Type the 6-digit code from the BACKEND terminal for $($U.Email)"
  $ver = Api POST '/auth/signup/verify' @{ email = $U.Email; otp = $code.Trim() }
  Check "OTP signup creates the $($U.Role) account" ($ver.Status -eq 201 -and [bool]$ver.Data.token) "status $($ver.Status) $($ver.Data.error)"
  if ($ver.Status -eq 201) { return $ver.Data }
  return $null
}

function Try-Book {
  param([string]$Token, [string]$VenueId, [string]$StartT, [string]$EndT, [string]$Purpose)
  $res = $null; $d = ''
  for ($i = 0; $i -lt 12; $i++) {
    $d = (Get-Date).AddDays((Get-Random -Minimum 40 -Maximum 340)).ToString('yyyy-MM-dd')
    $res = Api POST '/bookings' @{ venue_id = $VenueId; start = "${d}T$StartT"; end = "${d}T$EndT"; purpose = $Purpose } $Token
    if ($res.Status -ne 409) { break }
  }
  return @{ Res = $res; Date = $d }
}

function Has-Id($list, $id) { return (@($list | Where-Object { $_.id -eq $id }).Count -gt 0) }

# ---------------------------------------------------------------
Section '0. Backend reachable'
$h = Api GET '/health'
if ($h.Status -ne 200) { Write-Host 'Backend is not running on port 5000. Start it first.' -ForegroundColor Red; return }
Check 'GET /health returns 200' $true

Section '1. Validation and access without login'
$r = Api POST '/auth/signup/request' @{ name = 'T'; email = 'test.short@amrita.edu'; password = 'abc'; role = 'student' }
Check 'Short password is rejected (400)' ($r.Status -eq 400) "got $($r.Status)"
$r = Api POST '/auth/signup/request' @{ name = 'T'; email = 'test.role@amrita.edu'; password = 'Valid@1234'; role = 'janitor' }
Check 'Invalid role is rejected (400)' ($r.Status -eq 400) "got $($r.Status)"
$r = Api POST '/auth/signup/request' @{ name = 'T'; email = 'test.admin.bad@amrita.edu'; password = 'Valid@1234'; role = 'admin'; adminCode = 'wrong-code' }
Check 'Admin signup with a wrong code is rejected (403)' ($r.Status -eq 403) "got $($r.Status)"
$r = Api POST '/auth/signup' @{ name = 'T'; email = 'not-an-email'; password = 'Valid@1234'; role = 'student' }
Check 'Old one-step signup is blocked while OTP is required' ($r.Status -eq 400 -and "$($r.Data.error)" -match 'verification') "got $($r.Status) $($r.Data.error)"
$r = Api GET '/venues'
Check 'Venues without a token is refused (401)' ($r.Status -eq 401) "got $($r.Status)"
$r = Api GET '/venues' $null 'not-a-real-token'
Check 'Venues with a bad token is refused (401)' ($r.Status -eq 401) "got $($r.Status)"

Section '2. Accounts (OTP signup, or login if they already exist)'
$accounts = @{
  stu1 = @{ Name = 'Test Student One'; Email = 'test.student1@amrita.edu'; Password = 'Student@1234'; Role = 'student' }
  stu2 = @{ Name = 'Test Student Two'; Email = 'test.student2@amrita.edu'; Password = 'Student@1234'; Role = 'student' }
  fac1 = @{ Name = 'Test Faculty One (block head)'; Email = 'test.faculty1@amrita.edu'; Password = 'Faculty@1234'; Role = 'faculty' }
  fac2 = @{ Name = 'Test Faculty Two'; Email = 'test.faculty2@amrita.edu'; Password = 'Faculty@1234'; Role = 'faculty' }
}
$stu1 = Get-Session $accounts.stu1
$stu2 = Get-Session $accounts.stu2
$fac1 = Get-Session $accounts.fac1
$fac2 = Get-Session $accounts.fac2
if (-not ($stu1 -and $stu2 -and $fac1 -and $fac2)) { Write-Host 'Could not get all four accounts, stopping.' -ForegroundColor Red; return }

$r = Api POST '/auth/signup/request' @{ name = 'Dup'; email = $accounts.stu1.Email; password = 'Valid@1234'; role = 'student' }
Check 'Duplicate email is rejected (409)' ($r.Status -eq 409) "got $($r.Status)"
$r = Api POST '/auth/login' @{ email = $accounts.stu1.Email; password = 'wrong-password' }
Check 'Wrong password is rejected' ($r.Status -eq 400 -or $r.Status -eq 401) "got $($r.Status)"
$r = Api GET '/auth/me' $null $stu1.token
Check '/auth/me returns the logged-in student' ($r.Status -eq 200 -and $r.Data.user.email -eq $accounts.stu1.Email) "got $($r.Status)"

Section '3. Admin login'
Write-Host '  Use your existing admin account (nothing is saved).'
$adminEmail = Read-Host '  Admin email'
$sec = Read-Host '  Admin password' -AsSecureString
$adminPass = [System.Net.NetworkCredential]::new('', $sec).Password
$a = Api POST '/auth/login' @{ email = $adminEmail; password = $adminPass }
Check 'Admin can log in' ($a.Status -eq 200 -and $a.Data.user.role -eq 'admin') "status $($a.Status), role $($a.Data.user.role)"
if ($a.Status -ne 200) { return }
$admin = $a.Data

Section '4. Role access control'
$dateStr = (Get-Date).AddDays(30).ToString('yyyy-MM-dd')
$r = Api GET '/admin/twin' $null $stu1.token
Check 'Student cannot read the Digital Twin (403)' ($r.Status -eq 403) "got $($r.Status)"
$r = Api GET '/admin/security/flags?status=open' $null $stu1.token
Check 'Student cannot read security flags (403)' ($r.Status -eq 403) "got $($r.Status)"
$r = Api GET '/admin/twin' $null $fac2.token
Check 'Plain faculty cannot read the Digital Twin (403)' ($r.Status -eq 403) "got $($r.Status)"

Section '5. Find a block with a classroom and a hall'
$blocks = @((Api GET '/blocks' $null $stu1.token).Data)
$hallTypes = @('hall', 'conference_hall', 'auditorium', 'seminar_hall')
$target = $null
foreach ($b in $blocks) {
  $vs = @((Api GET "/venues?block_id=$($b.id)" $null $stu1.token).Data)
  $cr = $vs | Where-Object { $_.type -eq 'classroom' } | Select-Object -First 1
  $hl = $vs | Where-Object { $hallTypes -contains $_.type } | Select-Object -First 1
  if ($cr -and $hl) { $target = @{ Block = $b; Classroom = $cr; Hall = $hl }; break }
}
Check 'Found a block with both a classroom and a hall' ($null -ne $target)
if (-not $target) { return }
Info "Block: $($target.Block.name)   Classroom: $($target.Classroom.name)   Hall: $($target.Hall.name)"

Section '6. Make faculty1 the block head of that block'
$bh = Api PATCH "/users/$($fac1.user.id)/block-head" @{ is_block_head = $true; block_id = $target.Block.id } $admin.token
Check 'Admin assigns the block head' ($bh.Status -eq 200 -and $bh.Data.is_block_head -eq $true) "status $($bh.Status) $($bh.Data.error)"
$me = Api GET '/auth/me' $null $fac1.token
Check 'faculty1 now has block-head access' ($me.Data.user.is_block_head -eq $true)

Section '7. Booking rules'
$c = Try-Book $stu1.token $target.Classroom.id '14:00' '16:00' 'TEST student classroom workshop'
$classId = $c.Res.Data.id
Check 'Student classroom booking waits for the block head' ($c.Res.Status -eq 201 -and $c.Res.Data.status -eq 'pending_block_head') "status $($c.Res.Status) $($c.Res.Data.status) $($c.Res.Data.error)"

$r = Api POST '/bookings' @{ venue_id = $target.Classroom.id; start = "$($c.Date)T15:00"; end = "$($c.Date)T17:00"; purpose = 'TEST overlap' } $stu2.token
Check 'Overlapping booking is rejected (409)' ($r.Status -eq 409) "got $($r.Status)"

$f = Try-Book $fac2.token $target.Classroom.id '17:00' '18:00' 'TEST faculty seminar'
$facBookingId = $f.Res.Data.id
Check 'Faculty booking is approved immediately' ($f.Res.Status -eq 201 -and $f.Res.Data.status -eq 'approved') "status $($f.Res.Status) $($f.Res.Data.status) $($f.Res.Data.error)"

$hb = Try-Book $stu1.token $target.Hall.id '11:00' '13:00' 'TEST student hall symposium'
$hallId = $hb.Res.Data.id
Check 'Student hall booking waits for the block head' ($hb.Res.Status -eq 201 -and $hb.Res.Data.status -eq 'pending_block_head') "status $($hb.Res.Status) $($hb.Res.Data.status) $($hb.Res.Data.error)"

$mine = @((Api GET '/bookings/mine' $null $stu1.token).Data)
Check 'My Bookings lists the student bookings' ((Has-Id $mine $classId) -and (Has-Id $mine $hallId))

Section '8. Approval chain'
$q = @((Api GET '/bookings/queue' $null $fac1.token).Data)
Check 'Block head queue contains both bookings' ((Has-Id $q $classId) -and (Has-Id $q $hallId))

$d1 = Api POST "/bookings/$classId/decision" @{ decision = 'approve'; comment = 'TEST approve' } $fac1.token
Check 'Block head approves the classroom booking, which becomes approved' ($d1.Status -eq 200 -and $d1.Data.status -eq 'approved') "status $($d1.Status) $($d1.Data.status)"

$d2 = Api POST "/bookings/$hallId/decision" @{ decision = 'approve'; comment = 'TEST recommend to dean' } $fac1.token
Check 'Block head approves the hall booking, which moves to the dean' ($d2.Status -eq 200 -and $d2.Data.status -eq 'pending_dean') "status $($d2.Status) $($d2.Data.status)"

$aq = @((Api GET '/bookings/queue' $null $admin.token).Data)
Check 'Dean queue now contains the hall booking' (Has-Id $aq $hallId)

$d3 = Api POST "/bookings/$hallId/decision" @{ decision = 'approve'; comment = 'TEST dean approval' } $admin.token
Check 'Dean approves the hall booking, which becomes approved' ($d3.Status -eq 200 -and $d3.Data.status -eq 'approved') "status $($d3.Status) $($d3.Data.status)"

$hist = @((Api GET "/bookings/$hallId/history" $null $stu1.token).Data)
Check 'Audit history has at least 2 entries' ($hist.Count -ge 2) "got $($hist.Count)"

Section '9. Cancellation'
$cc = Api POST "/bookings/$classId/cancel" @{ comment = 'TEST cancel' } $stu1.token
Check 'Student cancel request moves to pending_cancellation' ($cc.Status -eq 200 -and $cc.Data.status -eq 'pending_cancellation') "status $($cc.Status) $($cc.Data.status)"
$cd = Api POST "/bookings/$classId/decision" @{ decision = 'approve'; comment = 'TEST cancel ok' } $fac1.token
Check 'Block head approves the cancellation, which becomes cancelled' ($cd.Status -eq 200 -and $cd.Data.status -eq 'cancelled') "status $($cd.Status) $($cd.Data.status)"

Section '10. Issue reporting'
$i = Api POST '/issues' @{ venue_id = $target.Classroom.id; description = 'TEST projector HDMI port loose' } $stu1.token
$issueId = $i.Data.id
Check 'Student reports an issue' ($i.Status -eq 201) "status $($i.Status) $($i.Data.error)"
$il = @((Api GET '/issues?status=open' $null $stu1.token).Data)
Check 'Issue appears in the open list' (Has-Id $il $issueId)
$ir = Api PATCH "/issues/$issueId/resolve" $null $fac1.token
Check 'Block head resolves the issue' ($ir.Status -eq 200 -and $ir.Data.status -eq 'resolved') "status $($ir.Status) $($ir.Data.status)"

Section '11. Admin tools'
$t = Api GET '/admin/twin' $null $admin.token
Check 'Digital Twin returns campus rows' ($t.Status -eq 200 -and @($t.Data).Count -gt 0) "status $($t.Status)"
$w = Api GET "/admin/whatif/venue?venue_id=$($target.Classroom.id)&date=$dateStr" $null $admin.token
Check 'What-If venue closure runs' ($w.Status -eq 200 -and $null -ne $w.Data.summary) "status $($w.Status)"
$w = Api GET "/admin/whatif/block?block_id=$($target.Block.id)&date=$dateStr" $null $admin.token
Check 'What-If block closure runs' ($w.Status -eq 200 -and $null -ne $w.Data.summary) "status $($w.Status)"
$am = @((Api GET '/amenities' $null $admin.token).Data)
if ($am.Count -gt 0 -and $am[0].id) {
  $w = Api GET "/admin/whatif/amenity?venue_id=$($target.Classroom.id)&amenity_id=$($am[0].id)&date=$dateStr" $null $admin.token
  Check 'What-If amenity failure runs' ($w.Status -eq 200) "status $($w.Status)"
} else { Info 'No amenities found, skipped the amenity What-If' }
$s = Api GET '/admin/security/flags?status=open' $null $admin.token
if ($s.Status -eq 200) { Check 'Security flags load' $true }
else { Info "Security flags returned status $($s.Status) (the agent may be offline), not counted" }

Section '12. Cleanup (best effort, not counted)'
foreach ($item in @(@{ Id = $hallId; Owner = $stu1 }, @{ Id = $facBookingId; Owner = $fac2 })) {
  if ($item.Id) {
    $x = Api POST "/bookings/$($item.Id)/cancel" @{ comment = 'TEST cleanup' } $item.Owner.token
    if ($x.Status -eq 200 -and $x.Data.status -eq 'pending_cancellation') {
      $y = Api POST "/bookings/$($item.Id)/decision" @{ decision = 'approve'; comment = 'TEST cleanup' } $fac1.token
      Info "Booking $($item.Id): now $($y.Data.status)"
    } else { Info "Booking $($item.Id): cancel returned status $($x.Status) $($x.Data.status)" }
  }
}

Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host " Passed: $script:Passed    Failed: $script:Failed" -ForegroundColor $(if ($script:Failed -eq 0) { 'Green' } else { 'Red' })
Write-Host '======================================' -ForegroundColor Cyan
Write-Host 'Left in the shared database for Manas to delete: users test.student1/2 and test.faculty1/2@amrita.edu, plus their cancelled bookings and one resolved issue.'