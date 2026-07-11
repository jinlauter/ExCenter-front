import { useMemo, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { excenterColors as colors } from '../theme.js';

const WIDTH = 680;
const HEIGHT = 260;
const MARGIN = { top: 20, right: 56, bottom: 32, left: 44 };
const PLOT_W = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom;

function formatDateShort(date) {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' });
}

function formatValue(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '');
}

function formatReferenceCaption(referenceRange, unit) {
  if (!referenceRange) return null;
  const { min, max } = referenceRange;
  const withUnit = (v) => `${formatValue(v)}${unit ? ` ${unit}` : ''}`;
  if (min != null && max != null) return `Faixa de referência: ${formatValue(min)} a ${withUnit(max)}`;
  if (max != null) return `Faixa de referência: até ${withUnit(max)}`;
  if (min != null) return `Faixa de referência: acima de ${withUnit(min)}`;
  return null;
}

export default function TrendChart({ points, unit, referenceRange }) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const svgRef = useRef(null);

  const { xScale, yScale, yTicks, bandY, bandH } = useMemo(() => {
    const dates = points.map((p) => p.date.getTime());
    const values = points.map((p) => p.value);

    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const dateSpan = maxDate - minDate || 1;

    let yMin = Math.min(...values);
    let yMax = Math.max(...values);
    if (referenceRange?.min != null) yMin = Math.min(yMin, referenceRange.min);
    if (referenceRange?.max != null) yMax = Math.max(yMax, referenceRange.max);
    if (yMin === yMax) {
      yMin -= 1;
      yMax += 1;
    }
    const pad = (yMax - yMin) * 0.15;
    yMin -= pad;
    yMax += pad;

    const xScale = (t) =>
      points.length === 1 ? PLOT_W / 2 : ((t - minDate) / dateSpan) * PLOT_W;
    const yScale = (v) => PLOT_H - ((v - yMin) / (yMax - yMin)) * PLOT_H;

    const yTicks = [yMin + (yMax - yMin) * 0.05, (yMin + yMax) / 2, yMax - (yMax - yMin) * 0.05];

    const bandTop = referenceRange?.max != null ? yScale(referenceRange.max) : 0;
    const bandBottom = referenceRange?.min != null ? yScale(referenceRange.min) : PLOT_H;

    return { xScale, yScale, yTicks, bandY: bandTop, bandH: bandBottom - bandTop };
  }, [points, referenceRange]);

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.date.getTime())} ${yScale(p.value)}`)
    .join(' ');

  const handlePointerMove = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * WIDTH - MARGIN.left;
    let nearest = 0;
    let nearestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(xScale(p.date.getTime()) - px);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  };

  const last = points[points.length - 1];
  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  const referenceCaption = formatReferenceCaption(referenceRange, unit);

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      {referenceCaption && (
        <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 0.5 }}>
          {referenceCaption}
        </Typography>
      )}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          {referenceRange && (
            <>
              <rect
                x={0}
                y={bandY}
                width={PLOT_W}
                height={bandH}
                fill={colors.primary}
                fillOpacity={0.08}
              />
              {referenceRange.max != null && (
                <line
                  x1={0}
                  x2={PLOT_W}
                  y1={yScale(referenceRange.max)}
                  y2={yScale(referenceRange.max)}
                  stroke={colors.primary}
                  strokeOpacity={0.4}
                  strokeWidth={1}
                  strokeDasharray="4 3"
                />
              )}
              {referenceRange.min != null && (
                <line
                  x1={0}
                  x2={PLOT_W}
                  y1={yScale(referenceRange.min)}
                  y2={yScale(referenceRange.min)}
                  stroke={colors.primary}
                  strokeOpacity={0.4}
                  strokeWidth={1}
                  strokeDasharray="4 3"
                />
              )}
            </>
          )}

          {yTicks.map((v, i) => (
            <g key={i}>
              <line
                x1={0}
                x2={PLOT_W}
                y1={yScale(v)}
                y2={yScale(v)}
                stroke={colors.borderSoft}
                strokeWidth={1}
              />
              <text
                x={-8}
                y={yScale(v)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={10}
                fill={colors.primaryDark}
                opacity={0.6}
              >
                {formatValue(v)}
              </text>
            </g>
          ))}

          {points.map((p, i) => (
            <text
              key={i}
              x={xScale(p.date.getTime())}
              y={PLOT_H + 20}
              textAnchor="middle"
              fontSize={10}
              fill={colors.primaryDark}
              opacity={0.6}
            >
              {formatDateShort(p.date)}
            </text>
          ))}

          <path d={path} fill="none" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

          {points.map((p, i) => (
            <circle
              key={i}
              cx={xScale(p.date.getTime())}
              cy={yScale(p.value)}
              r={5}
              fill={colors.primary}
              stroke="white"
              strokeWidth={2}
            />
          ))}

          <text
            x={xScale(last.date.getTime()) + 10}
            y={yScale(last.value) - 10}
            fontSize={12}
            fontWeight={600}
            fill={colors.primaryDark}
          >
            {formatValue(last.value)}
            {unit ? ` ${unit}` : ''}
          </text>

          {hovered && (
            <>
              <line
                x1={xScale(hovered.date.getTime())}
                x2={xScale(hovered.date.getTime())}
                y1={0}
                y2={PLOT_H}
                stroke={colors.primaryDark}
                strokeOpacity={0.3}
                strokeWidth={1}
              />
              <circle
                cx={xScale(hovered.date.getTime())}
                cy={yScale(hovered.value)}
                r={7}
                fill={colors.primary}
                stroke="white"
                strokeWidth={2}
              />
            </>
          )}
        </g>
      </svg>

      {hovered && (
        <Box
          sx={{
            position: 'absolute',
            top: 4,
            left: 4,
            backgroundColor: 'white',
            border: `0.5px solid ${colors.border}`,
            borderRadius: 1,
            padding: '4px 10px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            pointerEvents: 'none',
          }}
        >
          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
            {formatDateShort(hovered.date)}
          </Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
            {formatValue(hovered.value)}
            {unit ? ` ${unit}` : ''}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
