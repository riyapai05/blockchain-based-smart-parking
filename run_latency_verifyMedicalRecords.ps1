for ($i=1; $i -le 20; $i++) {

    truffle exec scripts/latency_verifyMedicalRecords.js $i --network sepolia   

    if ($i -lt 20) {
        Write-Host "Waiting 2 minutes..."
        Start-Sleep -Seconds 120
    }
}