import React from 'react';

interface CommandBadgeProps {
  commandCode: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBorder?: boolean;
}

export function CommandBadge({
  commandCode,
  size = 'md',
  className = '',
  showBorder = true,
}: CommandBadgeProps) {
  // Normalize command identifier
  const code = (commandCode || '').toUpperCase().trim();

  // Size mapping
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-11 h-11 sm:w-12 sm:h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const containerSize = sizeClasses[size] || sizeClasses.md;

  // Render specific SVG shield for each unit according to official PMMA attachments
  const renderBadgeSvg = () => {
    // 1. CPI - Direção Setorial (Anexo 02)
    if (code.includes('CPI') && !code.includes('CPA')) {
      return (
        <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-xs" aria-label="Brasão CPI">
          <defs>
            <clipPath id="cpi-shield-clip">
              <path d="M 10 12 C 10 12, 90 12, 90 12 C 90 60, 85 92, 50 112 C 15 92, 10 60, 10 12 Z" />
            </clipPath>
            <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFE066" />
              <stop offset="50%" stopColor="#F5B700" />
              <stop offset="100%" stopColor="#B38600" />
            </linearGradient>
            <linearGradient id="wings-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#E5A812" />
              <stop offset="50%" stopColor="#FFDE59" />
              <stop offset="100%" stopColor="#E5A812" />
            </linearGradient>
          </defs>

          {/* Outer Gold & Black Shield Border */}
          <path
            d="M 6 8 C 6 8, 94 8, 94 8 C 94 62, 88 97, 50 118 C 12 97, 6 62, 6 8 Z"
            fill="#F6B900"
          />
          <path
            d="M 8 10 C 8 10, 92 10, 92 10 C 92 61, 86 95, 50 115 C 14 95, 8 61, 8 10 Z"
            fill="#181E24"
          />

          {/* Inner Light Blue Field */}
          <path
            d="M 10 12 C 10 12, 90 12, 90 12 C 90 60, 85 92, 50 112 C 15 92, 10 60, 10 12 Z"
            fill="#27B4EE"
          />

          {/* Top Banner (Blue / White line / Red) with "CPI" */}
          <g>
            <rect x="10" y="12" width="80" height="11" fill="#1C2E6C" />
            <rect x="10" y="23" width="80" height="1.5" fill="#FFFFFF" />
            <rect x="10" y="24.5" width="80" height="9" fill="#DE1824" />
            <rect x="10" y="33.5" width="80" height="3.5" fill="#181E24" />
            <text
              x="50"
              y="28"
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize="14"
              fontWeight="900"
              fontFamily="Arial Black, Impact, sans-serif"
              letterSpacing="2"
            >
              CPI
            </text>
          </g>

          {/* Maranhão Map Silhouette in Background */}
          <path
            d="M 45 42 Q 55 40 65 48 Q 72 58 68 68 Q 62 76 56 86 Q 48 94 44 86 Q 38 78 40 66 Q 36 54 45 42 Z"
            fill="#EAF4FC"
            opacity="0.8"
          />

          {/* Golden Eagle Wings spreading out horizontally */}
          <g transform="translate(0, 10)">
            {/* Left Wing */}
            <path
              d="M 46 54 C 38 42, 22 40, 14 48 C 18 56, 26 64, 44 60 C 28 66, 22 72, 28 78 C 36 78, 44 70, 48 64 Z"
              fill="url(#wings-grad)"
              stroke="#8F6200"
              strokeWidth="0.8"
            />
            {/* Right Wing */}
            <path
              d="M 54 54 C 62 42, 78 40, 86 48 C 82 56, 74 64, 56 60 C 72 66, 78 72, 72 78 C 64 78, 56 70, 52 64 Z"
              fill="url(#wings-grad)"
              stroke="#8F6200"
              strokeWidth="0.8"
            />
          </g>

          {/* Vertical Golden Sword / Espadim */}
          <line x1="50" y1="40" x2="50" y2="92" stroke="#FFDE59" strokeWidth="3.5" />
          <line x1="50" y1="40" x2="50" y2="92" stroke="#8F6200" strokeWidth="0.8" />
          <path d="M 46 40 L 50 34 L 54 40 Z" fill="#FFE066" stroke="#8F6200" strokeWidth="0.8" />
          {/* Sword Guard & Pommel */}
          <rect x="42" y="78" width="16" height="4.5" rx="1.5" fill="#FFDE59" stroke="#8F6200" strokeWidth="0.8" />
          <circle cx="50" cy="94" r="3.2" fill="#FFDE59" stroke="#8F6200" strokeWidth="0.8" />

          {/* Crossed Golden Flintlock Pistols (Garruchas) */}
          <g>
            {/* Pistol 1 */}
            <line x1="36" y1="48" x2="64" y2="66" stroke="#FFDE59" strokeWidth="2.8" strokeLinecap="round" />
            <circle cx="36" cy="48" r="2.5" fill="#181E24" />
            {/* Pistol 2 */}
            <line x1="64" y1="48" x2="36" y2="66" stroke="#FFDE59" strokeWidth="2.8" strokeLinecap="round" />
            <circle cx="64" cy="48" r="2.5" fill="#181E24" />
          </g>

          {/* Center PMMA Medallion */}
          <g transform="translate(50, 58)">
            <circle cx="0" cy="0" r="13" fill="#1C2E6C" stroke="#FFDE59" strokeWidth="1.2" />
            <circle cx="0" cy="0" r="10.5" fill="#DE1824" stroke="#FFDE59" strokeWidth="0.8" />
            {/* Gold Star */}
            <polygon
              points="0,-8 2.4,-2.5 8,-2.5 3.6,1 5.4,6.5 0,3.2 -5.4,6.5 -3.6,1 -8,-2.5 -2.4,-2.5"
              fill="#FFDE59"
              stroke="#B38600"
              strokeWidth="0.4"
            />
            {/* Center flag disc */}
            <circle cx="0" cy="0" r="3.5" fill="#FFFFFF" stroke="#181E24" strokeWidth="0.4" />
            <rect x="-3.5" y="-3.5" width="3.5" height="3.5" fill="#1C2E6C" />
            <rect x="0" y="-3.5" width="3.5" height="3.5" fill="#15803D" />
            <rect x="-3.5" y="0" width="3.5" height="3.5" fill="#DE1824" />
            <rect x="0" y="0" width="3.5" height="3.5" fill="#FFDE59" />
          </g>

          {/* Bottom text "PM MA" */}
          <text
            x="50"
            y="106"
            textAnchor="middle"
            fill="#181E24"
            fontSize="7.5"
            fontWeight="900"
            fontFamily="Arial Black, sans-serif"
          >
            PM MA
          </text>
        </svg>
      );
    }

    // 2. CPA/I-1 (Bacabal - Anexo 03)
    if (code.includes('CPA/I-1') || code.includes('CPAI-1') || code.includes('CPAI1') || code === 'CPA/I-1') {
      return (
        <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-xs" aria-label="Brasão CPA/I-1">
          {/* Outer Shield */}
          <path d="M 6 8 C 6 8, 94 8, 94 8 C 94 62, 88 97, 50 118 C 12 97, 6 62, 6 8 Z" fill="#F6B900" />
          <path d="M 8 10 C 8 10, 92 10, 92 10 C 92 61, 86 95, 50 115 C 14 95, 8 61, 8 10 Z" fill="#181E24" />
          <path d="M 10 12 C 10 12, 90 12, 90 12 C 90 60, 85 92, 50 112 C 15 92, 10 60, 10 12 Z" fill="#27B4EE" />

          {/* Top Banner "CPA I - 1" */}
          <rect x="10" y="12" width="80" height="11" fill="#1C2E6C" />
          <rect x="10" y="23" width="80" height="1.5" fill="#FFFFFF" />
          <rect x="10" y="24.5" width="80" height="9" fill="#DE1824" />
          <rect x="10" y="33.5" width="80" height="3.5" fill="#181E24" />
          <text x="50" y="28" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="900" fontFamily="Arial Black, Impact">
            CPA I - 1
          </text>

          {/* Map with Bacabal / Central-North region highlighted in dark grey */}
          <path
            d="M 32 46 L 68 46 L 72 70 L 60 90 L 46 95 L 34 78 L 30 58 Z"
            fill="#E2E8F0"
          />
          {/* Highlighted CPAI-1 Sector */}
          <path
            d="M 44 48 L 62 48 L 64 64 L 52 74 L 42 62 Z"
            fill="#334155"
          />

          {/* Crossed Pistols */}
          <line x1="32" y1="58" x2="68" y2="78" stroke="#FFDE59" strokeWidth="3" strokeLinecap="round" />
          <circle cx="32" cy="58" r="3" fill="#181E24" />
          <line x1="68" y1="58" x2="32" y2="78" stroke="#FFDE59" strokeWidth="3" strokeLinecap="round" />
          <circle cx="68" cy="58" r="3" fill="#181E24" />

          {/* PMMA Star Medallion */}
          <g transform="translate(50, 74)">
            <circle cx="0" cy="0" r="12" fill="#1C2E6C" stroke="#FFDE59" strokeWidth="1.2" />
            <circle cx="0" cy="0" r="9.5" fill="#DE1824" stroke="#FFDE59" strokeWidth="0.8" />
            <polygon points="0,-7 2,-2 7,-2 3,1 5,6 0,3 -5,6 -3,1 -7,-2 -2,-2" fill="#FFDE59" />
          </g>

          <text x="50" y="106" textAnchor="middle" fill="#181E24" fontSize="8" fontWeight="900" fontFamily="Arial Black">
            PM MA
          </text>
        </svg>
      );
    }

    // 3. CPA/I-2 (Caxias - Anexo 04)
    if (code.includes('CPA/I-2') || code.includes('CPAI-2') || code.includes('CPAI2') || code === 'CPA/I-2') {
      return (
        <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-xs" aria-label="Brasão CPA/I-2">
          {/* Shield Outline */}
          <path d="M 6 8 C 6 8, 94 8, 94 8 C 94 62, 88 97, 50 118 C 12 97, 6 62, 6 8 Z" fill="#F6B900" />
          <path d="M 8 10 C 8 10, 92 10, 92 10 C 92 61, 86 95, 50 115 C 14 95, 8 61, 8 10 Z" fill="#181E24" />
          <path d="M 10 12 C 10 12, 90 12, 90 12 C 90 60, 85 92, 50 112 C 15 92, 10 60, 10 12 Z" fill="#27B4EE" />

          {/* Top Banner "CPA I - 2" */}
          <rect x="10" y="12" width="80" height="11" fill="#1C2E6C" />
          <rect x="10" y="23" width="80" height="1.5" fill="#FFFFFF" />
          <rect x="10" y="24.5" width="80" height="9" fill="#DE1824" />
          <rect x="10" y="33.5" width="80" height="3.5" fill="#181E24" />
          <text x="50" y="28" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="900" fontFamily="Arial Black">
            CPA I - 2
          </text>

          {/* Map Silhouette with Caxias region highlighted in Purple */}
          <path d="M 28 44 Q 50 38 72 44 Q 80 65 68 85 Q 52 98 34 85 Q 24 65 28 44 Z" fill="#FFFFFF" />
          {/* Purple highlight for Caxias (Leste) */}
          <path d="M 46 62 Q 62 58 64 74 Q 56 82 46 78 Z" fill="#4C1D95" />

          {/* Top Left PMMA Seal */}
          <circle cx="28" cy="45" r="7" fill="#1C2E6C" stroke="#FFDE59" strokeWidth="0.8" />
          <circle cx="28" cy="45" r="5" fill="#DE1824" />

          {/* Top Right Flag with "PROMOVENDO CIDADANIA" */}
          <path d="M 58 38 Q 72 36 78 44 Q 68 50 56 46 Z" fill="#1C2E6C" />
          <circle cx="68" cy="42" r="1" fill="#FFFFFF" />

          {/* Crossed Pistols */}
          <line x1="34" y1="72" x2="66" y2="88" stroke="#FFDE59" strokeWidth="3" strokeLinecap="round" />
          <circle cx="34" cy="72" r="2.5" fill="#C2410C" />
          <line x1="66" y1="72" x2="34" y2="88" stroke="#FFDE59" strokeWidth="3" strokeLinecap="round" />
          <circle cx="66" cy="72" r="2.5" fill="#C2410C" />

          <text x="50" y="104" textAnchor="middle" fill="#181E24" fontSize="8" fontWeight="900" fontFamily="Arial Black">
            PM MA
          </text>
        </svg>
      );
    }

    // 4. CPA/I-3 (Imperatriz - Anexo 05 - Metallic Shield with Eagle & Stars)
    if (code.includes('CPA/I-3') || code.includes('CPAI-3') || code.includes('CPAI3') || code === 'CPA/I-3') {
      return (
        <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-xs" aria-label="Brasão CPA/I-3">
          <defs>
            <linearGradient id="silver-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="30%" stopColor="#D8DDE3" />
              <stop offset="70%" stopColor="#A8B2BD" />
              <stop offset="100%" stopColor="#7B8896" />
            </linearGradient>
          </defs>

          {/* Outer Gold Border */}
          <path d="M 16 18 L 84 18 L 84 66 C 84 88, 50 106, 50 106 C 50 106, 16 88, 16 66 Z" fill="#F59E0B" />
          <path d="M 18 20 L 82 20 L 82 65 C 82 86, 50 103, 50 103 C 50 103, 18 86, 18 65 Z" fill="url(#silver-grad)" />

          {/* Top Ribbon "CPAI-3" */}
          <path d="M 22 10 L 78 10 L 84 16 L 78 22 L 22 22 L 16 16 Z" fill="#8C98A4" stroke="#475569" strokeWidth="0.8" />
          <text x="50" y="18" textAnchor="middle" fill="#0F172A" fontSize="9" fontWeight="900" fontFamily="Arial Black">
            CPAI-3
          </text>

          {/* 7 Golden 8-pointed Stars in Arch */}
          <g fill="#F59E0B">
            {[24, 32, 41, 50, 59, 68, 76].map((xPos, i) => (
              <polygon
                key={i}
                points={`${xPos},24 ${xPos + 1.5},27 ${xPos + 4},27 ${xPos + 2},29 ${xPos + 3},32 ${xPos},30 ${xPos - 3},32 ${xPos - 2},29 ${xPos - 4},27 ${xPos - 1.5},27`}
              />
            ))}
          </g>

          {/* Majestic Black Eagle with Sword */}
          <g transform="translate(50, 42)">
            {/* Eagle Wings */}
            <path d="M 0 -3 C -15 -8, -32 -6, -34 2 C -24 3, -12 7, 0 10 C 12 7, 24 3, 34 2 C 32 -6, 15 -8, 0 -3 Z" fill="#0F172A" />
            <polygon points="0,-6 -4,0 0,6 4,0" fill="#FFFFFF" />
            {/* Horizontal Sword */}
            <line x1="-22" y1="4" x2="22" y2="4" stroke="#CBD5E1" strokeWidth="1.8" />
            <rect x="-24" y="2.5" width="4" height="3" fill="#F59E0B" />
          </g>

          {/* Map of Tocantina with Maranhão Flag Pattern */}
          <g transform="translate(42, 54)">
            <path
              d="M 6 0 L 16 8 L 14 24 L 2 22 L 0 10 Z"
              fill="#DE1824"
              stroke="#F59E0B"
              strokeWidth="1.2"
            />
            <rect x="2" y="2" width="6" height="5" fill="#1C2E6C" />
            <circle cx="5" cy="4.5" r="0.8" fill="#FFFFFF" />
            <line x1="2" y1="11" x2="14" y2="11" stroke="#FFFFFF" strokeWidth="1.5" />
            <line x1="2" y1="16" x2="14" y2="16" stroke="#000000" strokeWidth="1.5" />
          </g>

          {/* Bottom Ribbon "FORÇA MÁXIMA NA REGIÃO TOCANTINA" */}
          <path d="M 10 104 L 90 104 L 94 110 L 90 116 L 10 116 L 6 110 Z" fill="#8C98A4" stroke="#475569" strokeWidth="0.8" />
          <text x="50" y="112" textAnchor="middle" fill="#0F172A" fontSize="4.8" fontWeight="900" fontFamily="Arial Black">
            FORÇA MÁXIMA NA REGIÃO TOCANTINA
          </text>
        </svg>
      );
    }

    // 5. CPA/I-4 (Balsas - Anexo 06 - Red South Highlight)
    if (code.includes('CPA/I-4') || code.includes('CPAI-4') || code.includes('CPAI4') || code === 'CPA/I-4') {
      return (
        <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-xs" aria-label="Brasão CPA/I-4">
          <path d="M 6 8 C 6 8, 94 8, 94 8 C 94 62, 88 97, 50 118 C 12 97, 6 62, 6 8 Z" fill="#F6B900" />
          <path d="M 8 10 C 8 10, 92 10, 92 10 C 92 61, 86 95, 50 115 C 14 95, 8 61, 8 10 Z" fill="#181E24" />
          <path d="M 10 12 C 10 12, 90 12, 90 12 C 90 60, 85 92, 50 112 C 15 92, 10 60, 10 12 Z" fill="#27B4EE" />

          {/* Top Banner "CPA I - 4" */}
          <rect x="10" y="12" width="80" height="11" fill="#1C2E6C" />
          <rect x="10" y="23" width="80" height="1.5" fill="#FFFFFF" />
          <rect x="10" y="24.5" width="80" height="9" fill="#DE1824" />
          <rect x="10" y="33.5" width="80" height="3.5" fill="#181E24" />
          <text x="50" y="28" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="900" fontFamily="Arial Black">
            CPA I - 4
          </text>

          {/* Map Silhouette with South/Balsas in Red */}
          <path d="M 32 44 L 68 44 L 72 68 L 62 88 L 44 94 L 30 76 Z" fill="#E2E8F0" />
          {/* Red Highlight in South/Balsas region */}
          <path d="M 54 48 L 70 54 L 64 74 L 54 68 Z" fill="#DC2626" />

          {/* Sword and Pistols */}
          <line x1="50" y1="42" x2="50" y2="88" stroke="#FFDE59" strokeWidth="2.8" />
          <line x1="34" y1="52" x2="66" y2="70" stroke="#FFDE59" strokeWidth="2.8" strokeLinecap="round" />
          <line x1="66" y1="52" x2="34" y2="70" stroke="#FFDE59" strokeWidth="2.8" strokeLinecap="round" />

          {/* PMMA Star Medallion */}
          <g transform="translate(50, 60)">
            <circle cx="0" cy="0" r="11" fill="#1C2E6C" stroke="#FFDE59" strokeWidth="1" />
            <circle cx="0" cy="0" r="8.5" fill="#DE1824" />
            <polygon points="0,-6 1.8,-1.8 6,-1.8 2.6,1 4.2,5 0,2.5 -4.2,5 -2.6,1 -6,-1.8 -1.8,-1.8" fill="#FFDE59" />
          </g>

          <text x="50" y="104" textAnchor="middle" fill="#181E24" fontSize="8" fontWeight="900" fontFamily="Arial Black">
            PM MA
          </text>
        </svg>
      );
    }

    // 6. CPA/I-5 (Pinheiro / Baixada - Anexo 07 - Green Background)
    if (code.includes('CPA/I-5') || code.includes('CPAI-5') || code.includes('CPAI5') || code === 'CPA/I-5') {
      return (
        <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-xs" aria-label="Brasão CPA/I-5">
          {/* Shield Outline with Green Inner Field */}
          <path d="M 6 8 C 6 8, 94 8, 94 8 C 94 62, 88 97, 50 118 C 12 97, 6 62, 6 8 Z" fill="#F6B900" />
          <path d="M 8 10 C 8 10, 92 10, 92 10 C 92 61, 86 95, 50 115 C 14 95, 8 61, 8 10 Z" fill="#181E24" />
          <path d="M 10 12 C 10 12, 90 12, 90 12 C 90 60, 85 92, 50 112 C 15 92, 10 60, 10 12 Z" fill="#10B981" />

          {/* Top Banner "CPA I - 5" */}
          <rect x="10" y="12" width="80" height="11" fill="#1C2E6C" />
          <rect x="10" y="23" width="80" height="1.5" fill="#FFFFFF" />
          <rect x="10" y="24.5" width="80" height="9" fill="#DE1824" />
          <rect x="10" y="33.5" width="80" height="3.5" fill="#181E24" />
          <text x="50" y="28" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="900" fontFamily="Arial Black">
            CPA I - 5
          </text>

          {/* Crossed Pistols on top */}
          <line x1="30" y1="44" x2="70" y2="60" stroke="#FFDE59" strokeWidth="3" strokeLinecap="round" />
          <circle cx="30" cy="44" r="3" fill="#181E24" />
          <line x1="70" y1="44" x2="30" y2="60" stroke="#FFDE59" strokeWidth="3" strokeLinecap="round" />
          <circle cx="70" cy="44" r="3" fill="#181E24" />

          {/* Map Silhouette with Pinheiro/Baixada Highlighted in Red */}
          <path d="M 36 50 L 64 50 L 68 76 L 50 94 L 32 76 Z" fill="#E2E8F0" />
          {/* Red Pinheiro Region */}
          <path d="M 44 50 L 56 50 L 58 64 L 46 64 Z" fill="#DC2626" />

          {/* Center PMMA Star Medallion */}
          <g transform="translate(50, 72)">
            <circle cx="0" cy="0" r="12" fill="#1C2E6C" stroke="#FFDE59" strokeWidth="1.2" />
            <circle cx="0" cy="0" r="9.5" fill="#DE1824" stroke="#FFDE59" strokeWidth="0.8" />
            <polygon points="0,-7 2,-2 7,-2 3,1 5,6 0,3 -5,6 -3,1 -7,-2 -2,-2" fill="#FFDE59" />
          </g>

          <text x="50" y="104" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="900" fontFamily="Arial Black">
            PM MA
          </text>
        </svg>
      );
    }

    // 7. CPA/I-6 (Viana / Santa Inês - Anexo 08)
    if (code.includes('CPA/I-6') || code.includes('CPAI-6') || code.includes('CPAI6') || code === 'CPA/I-6') {
      return (
        <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-xs" aria-label="Brasão CPA/I-6">
          <path d="M 6 8 C 6 8, 94 8, 94 8 C 94 62, 88 97, 50 118 C 12 97, 6 62, 6 8 Z" fill="#F6B900" />
          <path d="M 8 10 C 8 10, 92 10, 92 10 C 92 61, 86 95, 50 115 C 14 95, 8 61, 8 10 Z" fill="#181E24" />
          <path d="M 10 12 C 10 12, 90 12, 90 12 C 90 60, 85 92, 50 112 C 15 92, 10 60, 10 12 Z" fill="#27B4EE" />

          {/* Top Banner "CPA I - 6" */}
          <rect x="10" y="12" width="80" height="11" fill="#1C2E6C" />
          <rect x="10" y="23" width="80" height="1.5" fill="#FFFFFF" />
          <rect x="10" y="24.5" width="80" height="9" fill="#DE1824" />
          <rect x="10" y="33.5" width="80" height="3.5" fill="#181E24" />
          <text x="50" y="28" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="900" fontFamily="Arial Black">
            CPA I - 6
          </text>

          {/* Map with CPA/I-6 region in Red (South-West) */}
          <path d="M 32 44 L 68 44 L 72 70 L 60 90 L 46 95 L 34 78 Z" fill="#E2E8F0" />
          <path d="M 38 72 L 64 74 L 54 92 L 40 88 Z" fill="#DC2626" />

          {/* Vertical Sword & Crossed Pistols */}
          <line x1="50" y1="40" x2="50" y2="88" stroke="#FFDE59" strokeWidth="2.5" />
          <line x1="34" y1="52" x2="66" y2="70" stroke="#FFDE59" strokeWidth="2.8" strokeLinecap="round" />
          <line x1="66" y1="52" x2="34" y2="70" stroke="#FFDE59" strokeWidth="2.8" strokeLinecap="round" />

          {/* PMMA Star Medallion */}
          <g transform="translate(50, 62)">
            <circle cx="0" cy="0" r="11" fill="#1C2E6C" stroke="#FFDE59" strokeWidth="1" />
            <circle cx="0" cy="0" r="8.5" fill="#DE1824" />
            <polygon points="0,-6 1.8,-1.8 6,-1.8 2.6,1 4.2,5 0,2.5 -4.2,5 -2.6,1 -6,-1.8 -1.8,-1.8" fill="#FFDE59" />
          </g>

          <text x="50" y="104" textAnchor="middle" fill="#181E24" fontSize="8" fontWeight="900" fontFamily="Arial Black">
            PM MA
          </text>
        </svg>
      );
    }

    // 8. CPA/I-7 (Presidente Dutra - Anexo 09)
    if (code.includes('CPA/I-7') || code.includes('CPAI-7') || code.includes('CPAI7') || code === 'CPA/I-7') {
      return (
        <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-xs" aria-label="Brasão CPA/I-7">
          <path d="M 6 8 C 6 8, 94 8, 94 8 C 94 62, 88 97, 50 118 C 12 97, 6 62, 6 8 Z" fill="#F6B900" />
          <path d="M 8 10 C 8 10, 92 10, 92 10 C 92 61, 86 95, 50 115 C 14 95, 8 61, 8 10 Z" fill="#181E24" />
          <path d="M 10 12 C 10 12, 90 12, 90 12 C 90 60, 85 92, 50 112 C 15 92, 10 60, 10 12 Z" fill="#27B4EE" />

          {/* Top Banner "CPA I - 7" */}
          <rect x="10" y="12" width="80" height="11" fill="#1C2E6C" />
          <rect x="10" y="23" width="80" height="1.5" fill="#FFFFFF" />
          <rect x="10" y="24.5" width="80" height="9" fill="#DE1824" />
          <rect x="10" y="33.5" width="80" height="3.5" fill="#181E24" />
          <text x="50" y="28" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="900" fontFamily="Arial Black">
            CPA I - 7
          </text>

          {/* White Map of Maranhão */}
          <path d="M 32 44 Q 50 38 68 44 Q 76 65 66 85 Q 50 96 34 85 Q 26 65 32 44 Z" fill="#FFFFFF" />

          {/* Circular Seal & Swords */}
          <circle cx="50" cy="54" r="11" fill="#1C2E6C" stroke="#FFDE59" strokeWidth="1.2" />
          <circle cx="50" cy="54" r="8.5" fill="#DE1824" />
          <polygon points="50,48 51.5,52.5 56,52.5 52.5,55 54,59 50,56.5 46,59 47.5,55 44,52.5 48.5,52.5" fill="#FFDE59" />

          {/* Vertical Sword & Pistols */}
          <line x1="50" y1="58" x2="50" y2="86" stroke="#FFDE59" strokeWidth="2.8" />
          <line x1="38" y1="74" x2="62" y2="84" stroke="#FFDE59" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="62" y1="74" x2="38" y2="84" stroke="#FFDE59" strokeWidth="2.2" strokeLinecap="round" />

          <text x="50" y="104" textAnchor="middle" fill="#181E24" fontSize="8" fontWeight="900" fontFamily="Arial Black">
            PM MA
          </text>
        </svg>
      );
    }

    // 9. CPA/I-8 (Chapadinha / Nunes Freire - Anexo 10 - Laurel Wreath & "SERVIR E PROTEGER")
    if (code.includes('CPA/I-8') || code.includes('CPAI-8') || code.includes('CPAI8') || code === 'CPA/I-8') {
      return (
        <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-xs" aria-label="Brasão CPA/I-8">
          <path d="M 6 8 C 6 8, 94 8, 94 8 C 94 62, 88 97, 50 118 C 12 97, 6 62, 6 8 Z" fill="#F6B900" />
          <path d="M 8 10 C 8 10, 92 10, 92 10 C 92 61, 86 95, 50 115 C 14 95, 8 61, 8 10 Z" fill="#181E24" />
          <path d="M 10 12 C 10 12, 90 12, 90 12 C 90 60, 85 92, 50 112 C 15 92, 10 60, 10 12 Z" fill="#27B4EE" />

          {/* Top Banner "PMMA CPI / CPAI-8" */}
          <rect x="10" y="12" width="80" height="7" fill="#1C2E6C" />
          <text x="50" y="17.5" textAnchor="middle" fill="#FFFFFF" fontSize="5.5" fontWeight="900" fontFamily="Arial Black" letterSpacing="1">
            PMMA CPI
          </text>
          <rect x="10" y="19" width="80" height="11" fill="#DE1824" />
          <text x="50" y="28" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="900" fontFamily="Arial Black">
            CPAI-8
          </text>
          <rect x="10" y="30" width="80" height="2.5" fill="#181E24" />

          {/* Laurel Wreaths on both sides */}
          <g fill="#F59E0B">
            <path d="M 16 50 Q 12 70 24 88 Q 18 72 20 54 Z" />
            <path d="M 84 50 Q 88 70 76 88 Q 82 72 80 54 Z" />
          </g>

          {/* Deep Blue Map of Maranhão with Striped CPAI-8 region */}
          <path d="M 32 44 L 68 44 L 72 70 L 60 90 L 46 94 L 34 78 Z" fill="#1C2E6C" />
          {/* CPAI-8 Sector with Maranhão Flag Colors */}
          <path d="M 38 46 L 54 46 L 50 62 L 36 60 Z" fill="#DE1824" />
          <polygon points="44,50 45,52 48,52 45.5,53.5 46.5,56 44,54.5 41.5,56 42.5,53.5 40,52 43,52" fill="#F59E0B" />

          {/* Vertical Sword & Pistols */}
          <line x1="50" y1="42" x2="50" y2="84" stroke="#FFDE59" strokeWidth="2.8" />
          <line x1="38" y1="74" x2="62" y2="84" stroke="#FFDE59" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="62" y1="74" x2="38" y2="84" stroke="#FFDE59" strokeWidth="2.5" strokeLinecap="round" />

          {/* Bottom Ribbon "SERVIR E PROTEGER" */}
          <path d="M 14 98 L 86 98 L 82 108 L 18 108 Z" fill="#F6B900" stroke="#8F6200" strokeWidth="0.8" />
          <text x="50" y="105.5" textAnchor="middle" fill="#0F172A" fontSize="5.5" fontWeight="900" fontFamily="Arial Black">
            SERVIR E PROTEGER
          </text>
        </svg>
      );
    }

    // 10. CPA/I-9 (Itapecuru Mirim - Anexo 11)
    if (code.includes('CPA/I-9') || code.includes('CPAI-9') || code.includes('CPAI9') || code === 'CPA/I-9') {
      return (
        <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-xs" aria-label="Brasão CPA/I-9">
          <path d="M 6 8 C 6 8, 94 8, 94 8 C 94 62, 88 97, 50 118 C 12 97, 6 62, 6 8 Z" fill="#F6B900" />
          <path d="M 8 10 C 8 10, 92 10, 92 10 C 92 61, 86 95, 50 115 C 14 95, 8 61, 8 10 Z" fill="#181E24" />
          <path d="M 10 12 C 10 12, 90 12, 90 12 C 90 60, 85 92, 50 112 C 15 92, 10 60, 10 12 Z" fill="#27B4EE" />

          {/* Top Banner "CPAI-9" */}
          <rect x="10" y="12" width="80" height="11" fill="#1C2E6C" />
          <rect x="10" y="23" width="80" height="1.5" fill="#FFFFFF" />
          <rect x="10" y="24.5" width="80" height="9" fill="#DE1824" />
          <rect x="10" y="33.5" width="80" height="3.5" fill="#181E24" />
          <text x="50" y="28" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="900" fontFamily="Arial Black">
            CPAI - 9
          </text>

          {/* Map & Central Insignia */}
          <path d="M 32 44 Q 50 38 68 44 Q 76 65 66 85 Q 50 96 34 85 Q 26 65 32 44 Z" fill="#E2E8F0" />
          {/* Crossed Pistols */}
          <line x1="36" y1="56" x2="64" y2="76" stroke="#FFDE59" strokeWidth="2.8" strokeLinecap="round" />
          <line x1="64" y1="56" x2="36" y2="76" stroke="#FFDE59" strokeWidth="2.8" strokeLinecap="round" />

          {/* Star Medallion */}
          <g transform="translate(50, 66)">
            <circle cx="0" cy="0" r="10" fill="#1C2E6C" stroke="#FFDE59" strokeWidth="1" />
            <circle cx="0" cy="0" r="7.5" fill="#DE1824" />
            <polygon points="0,-5 1.5,-1.5 5,-1.5 2,1 3.5,4 0,2 -3.5,4 -2,1 -5,-1.5 -1.5,-1.5" fill="#FFDE59" />
          </g>

          <text x="50" y="104" textAnchor="middle" fill="#181E24" fontSize="8" fontWeight="900" fontFamily="Arial Black">
            PM MA
          </text>
        </svg>
      );
    }

    // Default Fallback PMMA Badge
    return (
      <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-xs" aria-label="Brasão PMMA">
        <path d="M 6 8 C 6 8, 94 8, 94 8 C 94 62, 88 97, 50 118 C 12 97, 6 62, 6 8 Z" fill="#F6B900" />
        <path d="M 8 10 C 8 10, 92 10, 92 10 C 92 61, 86 95, 50 115 C 14 95, 8 61, 8 10 Z" fill="#181E24" />
        <path d="M 10 12 C 10 12, 90 12, 90 12 C 90 60, 85 92, 50 112 C 15 92, 10 60, 10 12 Z" fill="#27B4EE" />
        <rect x="10" y="12" width="80" height="15" fill="#1C2E6C" />
        <text x="50" y="24" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="900">
          {code.slice(0, 8)}
        </text>
        <circle cx="50" cy="65" r="16" fill="#DE1824" stroke="#FFDE59" strokeWidth="2" />
        <polygon points="50,54 53,62 62,62 55,67 58,75 50,70 42,75 45,67 38,62 47,62" fill="#FFDE59" />
        <text x="50" y="104" textAnchor="middle" fill="#181E24" fontSize="8" fontWeight="900">
          PM MA
        </text>
      </svg>
    );
  };

  return (
    <div
      className={`relative shrink-0 flex items-center justify-center transition-transform hover:scale-105 select-none ${containerSize} ${className}`}
      title={commandCode}
    >
      {renderBadgeSvg()}
    </div>
  );
}
