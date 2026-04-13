import React, { useMemo, useState } from 'react'
import { useAppStore } from '../../store/app.store'
import { validateProjectSchema } from '../ai-chat/schema-validator'

const MONO: React.CSSProperties = { fontFamily: '"JetBrains Mono","Fira Code",monospace' }

type ViewTab = 'overview' | 'requirements' | 'roles' | 'interfaces' | 'plans' | 'validation'

const CATEGORY_LABEL: Record<string, string> = {
  requirements: '需求',
  roles: '角色',
  interfaces: '接口',
  connections: '连接',
  blockly: '程序',
}

const LEVEL_COLOR: Record<string, string> = {
  error: '#ff6b6b',
  warn: '#fbbf24',
  info: '#60a5fa',
}

function Card({ title, value, accent }: { title: string; value: string | number; accent: string }) {
  return (
    <div style={{ background: '#0d1e33', border: `1px solid ${accent}35`, borderRadius: 6, padding: '8px 10px' }}>
      <div style={{ fontSize: 7, color: '#7aa2c7', letterSpacing: '.1em' }}>{title}</div>
      <div style={{ marginTop: 3, fontSize: 12, color: accent, fontWeight: 700 }}>{value}</div>
    </div>
  )
}

function BulletList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) {
    return <div style={{ fontSize: 8, color: '#5a7a9a' }}>{empty}</div>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {items.map((item, idx) => (
        <div key={`${item}_${idx}`} style={{ fontSize: 8.5, color: '#d6e5f5', lineHeight: 1.6 }}>
          <span style={{ color: '#00ffcc', marginRight: 6 }}>•</span>
          {item}
        </div>
      ))}
    </div>
  )
}

export function DesignChainPanel() {
  const schema = useAppStore(s => s.schema)
  const [tab, setTab] = useState<ViewTab>('overview')

  const validation = useMemo(() => (schema ? validateProjectSchema(schema) : null), [schema])

  if (!schema) {
    return (
      <div style={{ ...MONO, background: '#0f2744', borderBottom: '1px solid #2a4a6f', padding: '12px' }}>
        <div style={{ fontSize: 10, color: '#ffffff', fontWeight: 700, letterSpacing: '.08em' }}>🧠 设计链与校验</div>
        <div style={{ marginTop: 6, fontSize: 8, color: '#5a7a9a', lineHeight: 1.7 }}>
          等待项目生成后，这里会展示从产品说明提取出的需求、元件职责、接口计划、连接计划，以及系统一致性校验结果。
        </div>
      </div>
    )
  }

  const tabs: { key: ViewTab; label: string }[] = [
    { key: 'overview', label: '总览' },
    { key: 'requirements', label: '需求' },
    { key: 'roles', label: '角色' },
    { key: 'interfaces', label: '接口' },
    { key: 'plans', label: '连接计划' },
    { key: 'validation', label: '校验' },
  ]

  return (
    <div style={{ ...MONO, display: 'flex', flexDirection: 'column', background: '#0f2744', borderBottom: '1px solid #2a4a6f', maxHeight: 360 }}>
      <div style={{ padding: '10px 12px 8px', background: '#162d4a', borderBottom: '1px solid #2a4a6f' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div style={{ fontSize: 10, color: '#ffffff', fontWeight: 700, letterSpacing: '.08em' }}>🧠 设计链与校验</div>
            <div style={{ marginTop: 3, fontSize: 7.5, color: '#7aa2c7', letterSpacing: '.08em' }}>
              产品说明 → 需求 → 元件职责 → 接口 → 连接计划 → 最终接线
            </div>
          </div>
          {validation && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 7, color: '#7aa2c7', letterSpacing: '.1em' }}>一致性评分</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: validation.ok ? '#00ff9d' : '#fbbf24' }}>{validation.score}</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #1e3a5f', background: '#0a1628', flexShrink: 0, overflowX: 'auto' }}>
        {tabs.map(item => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            style={{
              ...MONO,
              border: 'none',
              background: 'transparent',
              color: tab === item.key ? '#00ffcc' : '#6c8cab',
              borderBottom: tab === item.key ? '2px solid #00ffcc' : '2px solid transparent',
              padding: '7px 10px',
              fontSize: 7.5,
              fontWeight: 700,
              letterSpacing: '.08em',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '10px 12px', overflowY: 'auto' }}>
        {tab === 'overview' && validation && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
              <Card title="需求项" value={schema.requirements.coreFunctions.length} accent="#60a5fa" />
              <Card title="功能角色" value={schema.functionalRoles.length} accent="#00ff9d" />
              <Card title="接口计划" value={schema.interfacePlan.length} accent="#c084fc" />
              <Card title="连接计划" value={schema.connectionPlan.length} accent="#fb923c" />
            </div>

            <div style={{ background: '#0d1e33', border: '1px solid #2a4a6f', borderRadius: 6, padding: '10px' }}>
              <div style={{ fontSize: 8, color: '#7aa2c7', letterSpacing: '.1em', marginBottom: 6 }}>需求摘要</div>
              <div style={{ fontSize: 8.5, color: '#d6e5f5', lineHeight: 1.7 }}>{schema.requirements.summary || '暂无摘要'}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ background: '#0d1e33', border: '1px solid #2a4a6f', borderRadius: 6, padding: '10px' }}>
                <div style={{ fontSize: 8, color: '#7aa2c7', letterSpacing: '.1em', marginBottom: 6 }}>核心功能</div>
                <BulletList items={schema.requirements.coreFunctions} empty="暂无核心功能" />
              </div>
              <div style={{ background: '#0d1e33', border: '1px solid #2a4a6f', borderRadius: 6, padding: '10px' }}>
                <div style={{ fontSize: 8, color: '#7aa2c7', letterSpacing: '.1em', marginBottom: 6 }}>校验摘要</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 8, color: '#ff6b6b' }}>错误 {validation.summary.errors}</span>
                  <span style={{ fontSize: 8, color: '#fbbf24' }}>警告 {validation.summary.warnings}</span>
                  <span style={{ fontSize: 8, color: '#60a5fa' }}>提示 {validation.summary.infos}</span>
                </div>
                <div style={{ marginTop: 8, fontSize: 8, color: validation.ok ? '#00ff9d' : '#fbbf24', lineHeight: 1.7 }}>
                  {validation.ok ? '当前链路已通过硬性校验。' : '当前链路仍存在硬性问题或弱关联项，请结合下面的详细列表继续修正。'}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'requirements' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['输入', schema.requirements.inputs.map(item => `${item.name}：${item.purpose}`)],
              ['输出', schema.requirements.outputs.map(item => `${item.name}：${item.purpose}`)],
              ['交互', schema.requirements.interactions],
              ['通信', schema.requirements.communication],
              ['供电', schema.requirements.power],
              ['约束', schema.requirements.constraints],
            ].map(([title, items]) => (
              <div key={title} style={{ background: '#0d1e33', border: '1px solid #2a4a6f', borderRadius: 6, padding: '10px' }}>
                <div style={{ fontSize: 8, color: '#7aa2c7', letterSpacing: '.1em', marginBottom: 6 }}>{title}</div>
                <BulletList items={items as string[]} empty={`暂无${title}`} />
              </div>
            ))}
          </div>
        )}

        {tab === 'roles' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {schema.functionalRoles.map(role => {
              const component = schema.components.find(item => item.id === role.componentId)
              return (
                <div key={role.id} style={{ background: '#0d1e33', border: '1px solid #2a4a6f', borderRadius: 6, padding: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                    <span style={{ fontSize: 8.5, color: '#00ffcc', fontWeight: 700 }}>{role.role}</span>
                    <span style={{ fontSize: 7.5, color: '#7aa2c7' }}>{component?.label ?? role.componentId}</span>
                  </div>
                  <div style={{ fontSize: 8.5, color: '#d6e5f5', lineHeight: 1.7 }}>{role.responsibility}</div>
                  <div style={{ marginTop: 6, fontSize: 7.5, color: '#fbbf24' }}>requiredSignals: {role.requiredSignals.join(' · ') || '未声明'}</div>
                </div>
              )
            })}
            {schema.functionalRoles.length === 0 && <div style={{ fontSize: 8, color: '#5a7a9a' }}>暂无功能角色</div>}
          </div>
        )}

        {tab === 'interfaces' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {schema.interfacePlan.map(plan => (
              <div key={plan.id} style={{ background: '#0d1e33', border: '1px solid #2a4a6f', borderRadius: 6, padding: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 8.5, color: '#c084fc', fontWeight: 700 }}>{plan.busType.toUpperCase()}</span>
                  <span style={{ fontSize: 7.5, color: '#7aa2c7' }}>{plan.participants.join(' → ')}</span>
                </div>
                <div style={{ fontSize: 8, color: '#d6e5f5', lineHeight: 1.7, marginBottom: 6 }}>{plan.rationale}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {plan.signals.map(signal => (
                    <div key={`${plan.id}_${signal.name}_${signal.fromPin}_${signal.toPin}`} style={{ fontSize: 7.8, color: '#9fd0ff' }}>
                      {signal.name}: {signal.fromComponentId}.{signal.fromPin} → {signal.toComponentId}.{signal.toPin}{signal.required ? ' · 必需' : ''}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {schema.interfacePlan.length === 0 && <div style={{ fontSize: 8, color: '#5a7a9a' }}>暂无接口计划</div>}
          </div>
        )}

        {tab === 'plans' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {schema.connectionPlan.map(plan => (
              <div key={plan.id} style={{ background: '#0d1e33', border: '1px solid #2a4a6f', borderRadius: 6, padding: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 8.5, color: '#fb923c', fontWeight: 700 }}>{plan.kind.toUpperCase()} · {plan.signal}</span>
                  <span style={{ fontSize: 7.5, color: plan.required ? '#00ff9d' : '#fbbf24' }}>{plan.required ? '必需' : '可选'}</span>
                </div>
                <div style={{ marginTop: 5, fontSize: 8, color: '#d6e5f5' }}>
                  {plan.fromComponentId}.{plan.sourcePin} → {plan.toComponentId}.{plan.targetPin}
                </div>
                <div style={{ marginTop: 5, fontSize: 7.5, color: '#7aa2c7', lineHeight: 1.6 }}>{plan.rationale}</div>
              </div>
            ))}
            {schema.connectionPlan.length === 0 && <div style={{ fontSize: 8, color: '#5a7a9a' }}>暂无连接计划</div>}
          </div>
        )}

        {tab === 'validation' && validation && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {validation.issues.map(issue => (
              <div key={issue.id} style={{ background: '#0d1e33', border: `1px solid ${LEVEL_COLOR[issue.level]}35`, borderRadius: 6, padding: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 7.5, color: LEVEL_COLOR[issue.level], fontWeight: 700, letterSpacing: '.08em' }}>{issue.level.toUpperCase()}</span>
                  <span style={{ fontSize: 7.5, color: '#7aa2c7' }}>{CATEGORY_LABEL[issue.category]}</span>
                </div>
                <div style={{ fontSize: 8.3, color: '#d6e5f5', lineHeight: 1.7 }}>{issue.message}</div>
              </div>
            ))}
            {validation.issues.length === 0 && <div style={{ fontSize: 8, color: '#00ff9d' }}>未发现问题。</div>}
          </div>
        )}
      </div>
    </div>
  )
}

