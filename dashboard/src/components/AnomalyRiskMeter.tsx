import React from 'react'
import { SensorReading, RiskLevel } from '../lib/types'

interface AnomalyRiskMeterProps {
  reading: SensorReading | null
}

export const AnomalyRiskMeter: React.FC<AnomalyRiskMeterProps> = ({ reading }) => {
  const score = reading?.anomaly_score ?? 12.0
  const riskLevel: RiskLevel = reading?.risk_level ?? (score >= 66 ? 'HIGH' : score >= 31 ? 'MEDIUM' : 'LOW')
  const status = reading?.status ?? 'NORMAL'

  const getRiskColor = (level: RiskLevel) => {
    switch (level) {
      case 'HIGH':
        return '#ef4444'
      case 'MEDIUM':
        return '#f59e0b'
      case 'LOW':
      default:
        return '#10b981'
    }
  }

  const isHighRisk = riskLevel === 'HIGH' || status === 'TAMPERED'

  return (
    <div className={`risk-card ${isHighRisk ? 'risk-card-alert' : ''}`}>
      <div className="risk-card-header">
        <div className="risk-title-wrap">
          <span className="risk-header-icon">{isHighRisk ? '🚨' : '🤖'}</span>
          <div>
            <h3>AI / ML Theft & Anomaly Risk Analysis</h3>
            <p className="risk-subtitle">Isolation Forest & Electrical Boundary Assessment</p>
          </div>
        </div>
        <span className={`risk-badge badge-${riskLevel.toLowerCase()}`}>
          {riskLevel} RISK
        </span>
      </div>

      <div className="risk-body">
        {/* Circular Gauge / Score Display */}
        <div className="score-display">
          <div className="score-circle" style={{ borderColor: getRiskColor(riskLevel) }}>
            <span className="score-number">{score.toFixed(0)}</span>
            <span className="score-out-of">/ 100</span>
          </div>
          <div className="score-meta">
            <div className="meter-label">Calculated Anomaly Score</div>
            <div className="meter-bar-track">
              <div
                className="meter-bar-fill"
                style={{
                  width: `${Math.min(100, Math.max(5, score))}%`,
                  backgroundColor: getRiskColor(riskLevel),
                }}
              />
            </div>
            <div className="meter-scale-ticks">
              <span>0 (Nominal)</span>
              <span>30 (Low)</span>
              <span>65 (Suspicious)</span>
              <span>100 (Theft)</span>
            </div>
          </div>
        </div>

        {/* Diagnosis / Explanation Box */}
        <div className="diagnosis-box">
          <div className="diagnosis-title">
            <span>🔍</span> Diagnostic Assessment:
          </div>
          <p className="diagnosis-text">
            {status === 'TAMPERED'
              ? 'ALERT: High probability of electricity theft or meter bypass detected. Measured current is inconsistent with nominal grid connection.'
              : status === 'FAULT'
              ? 'WARNING: Transducer or sensor hardware out of operating limits. Check physical connections.'
              : status === 'SUSPICIOUS'
              ? 'NOTICE: Consumption signature deviates significantly from circadian domestic baseline.'
              : 'NORMAL: Electrical consumption patterns conform to expected domestic baseline load.'}
          </p>
          <div className="algorithm-tag">
            Engine: {reading?.modelVersion ?? 'hybrid-iso-forest-v1.0'} &nbsp;·&nbsp; Threshold: 65.0
          </div>
        </div>
      </div>

      <div className="risk-footer-note">
        ℹ️ Note: Anomaly score reflects statistical and electrical pattern variance. It constitutes an alert indicator for inspection, not legal evidence.
      </div>
    </div>
  )
}
export default AnomalyRiskMeter
