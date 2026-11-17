import { translate as t } from '@/i18n/language'
import { useLanguage } from '@/hooks/useLanguage'
import styles from './Footer.module.css'

const SOCIALS = ['Instagram', 'Facebook', 'X', 'YouTube', 'TikTok']

export function Footer() {
  useLanguage()
  return (
    <footer className={styles.footer}>
      <div className={styles.bar}>
        <span className={styles.title}>{t("Síguenos en redes")}</span>

        <ul className={styles.social}>
          {SOCIALS.map((name) => (
            <li key={name}>
              <a className={styles.socialItem} href="#">
                <span className={styles.dot} aria-hidden="true" />
                {name}
              </a>
            </li>
          ))}
        </ul>

        <span className={styles.copy}>© 2026 SM-Xplore</span>
      </div>
    </footer>
  )
}
