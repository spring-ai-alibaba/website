import React from 'react';
import Footer from '@theme-original/Footer';
import type FooterType from '@theme/Footer';
import type {WrapperProps} from '@docusaurus/types';
import projectConfig from '../../../project.config';

type Props = WrapperProps<typeof FooterType>;

export default function FooterWrapper(props: Props): JSX.Element {
  return (
    <>
      <Footer {...props} />
      <div style={{
        backgroundColor: 'var(--ifm-footer-background-color)',
        color: 'var(--ifm-footer-color)',
        padding: '1rem 0 1.5rem',
        textAlign: 'center',
        borderTop: '1px solid var(--ifm-footer-border-color, rgba(0, 0, 0, 0.1))',
      }}>
        <div className="container" style={{
          maxWidth: '900px',
          margin: '0 auto',
          padding: '0 1rem',
        }}>
          <p style={{
            fontSize: '0.9rem',
            lineHeight: '1.6',
            margin: 0,
            opacity: 0.85,
          }}>
            {projectConfig.description}
          </p>
        </div>
      </div>
    </>
  );
}
