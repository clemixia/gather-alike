import { useState } from 'react';
import {
  SKIN_OPTIONS,
  HAIR_OPTIONS,
  HAIR_COLOR_OPTIONS,
  CLOTHES_OPTIONS,
  CLOTHES_COLOR_OPTIONS,
  ACCESSORY_OPTIONS,
  SKIN_COLORS,
  HAIR_COLORS,
  CLOTHES_COLORS,
} from '../game/types';
import type { AvatarConfig } from '../game/types';

interface Props {
  initial: AvatarConfig;
  onSave: (config: AvatarConfig) => Promise<boolean> | boolean;
  onClose: () => void;
}

export default function AvatarCustomizer({ initial, onSave, onClose }: Props) {
  const [config, setConfig] = useState<AvatarConfig>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function update<K extends keyof AvatarConfig>(key: K, value: AvatarConfig[K]) {
    setConfig((c) => ({ ...c, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    const ok = await onSave(config);
    setSaving(false);
    if (ok) {
      setSaved(true);
      setTimeout(() => onClose(), 600);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(91, 70, 80, 0.5)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="card stack-lg"
        style={{
          width: 'min(92vw, 520px)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="topbar">
          <h1>✨ Customize</h1>
          <button className="button secondary small" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Name */}
        <div>
          <div className="label">Name</div>
          <input
            className="input"
            value={config.name}
            onChange={(e) => update('name', e.target.value.slice(0, 20))}
            maxLength={20}
          />
        </div>

        {/* Skin */}
        <OptionGroup label="Skin tone">
          {SKIN_OPTIONS.map((opt) => (
            <ColorSwatch
              key={opt}
              color={SKIN_COLORS[opt]}
              selected={config.skin === opt}
              onClick={() => update('skin', opt)}
              title={opt}
            />
          ))}
        </OptionGroup>

        {/* Hair style */}
        <OptionGroup label="Hair style">
          {HAIR_OPTIONS.map((opt) => (
            <PillButton
              key={opt}
              label={opt}
              selected={config.hair === opt}
              onClick={() => update('hair', opt)}
            />
          ))}
        </OptionGroup>

        {/* Hair color */}
        <OptionGroup label="Hair color">
          {HAIR_COLOR_OPTIONS.map((opt) => (
            <ColorSwatch
              key={opt}
              color={HAIR_COLORS[opt]}
              selected={config.hairColor === opt}
              onClick={() => update('hairColor', opt)}
              title={opt}
            />
          ))}
        </OptionGroup>

        {/* Clothes */}
        <OptionGroup label="Clothes">
          {CLOTHES_OPTIONS.map((opt) => (
            <PillButton
              key={opt}
              label={opt}
              selected={config.clothes === opt}
              onClick={() => update('clothes', opt)}
            />
          ))}
        </OptionGroup>

        {/* Clothes color */}
        <OptionGroup label="Clothes color">
          {CLOTHES_COLOR_OPTIONS.map((opt) => (
            <ColorSwatch
              key={opt}
              color={CLOTHES_COLORS[opt]}
              selected={config.clothesColor === opt}
              onClick={() => update('clothesColor', opt)}
              title={opt}
            />
          ))}
        </OptionGroup>

        {/* Accessory */}
        <OptionGroup label="Accessory">
          {ACCESSORY_OPTIONS.map((opt) => (
            <PillButton
              key={opt}
              label={opt}
              selected={config.accessory === opt}
              onClick={() => update('accessory', opt)}
            />
          ))}
        </OptionGroup>

        <div className="stack">
          <button className="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : saved ? '✅ Saved!' : '💾 Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function OptionGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>{children}</div>
    </div>
  );
}

function ColorSwatch({
  color,
  selected,
  onClick,
  title,
}: {
  color: number;
  selected: boolean;
  onClick: () => void;
  title: string;
}) {
  const hex = `#${color.toString(16).padStart(6, '0')}`;
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        background: hex,
        border: selected ? '3px solid var(--accent-dark)' : '2px solid var(--border)',
        cursor: 'pointer',
        boxShadow: selected ? '0 0 0 3px rgba(242, 95, 127, 0.25)' : 'none',
        padding: 0,
      }}
    />
  );
}

function PillButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="button secondary small"
      style={{
        background: selected ? 'var(--accent)' : '#fff',
        color: selected ? '#fff' : 'var(--accent-dark)',
        borderColor: selected ? 'var(--accent)' : 'var(--border)',
        textTransform: 'capitalize',
      }}
    >
      {label}
    </button>
  );
}