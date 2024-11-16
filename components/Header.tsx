

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import styles from '../styles/header.module.css';

export function Header() {
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const toggleDropdown = () => {
        setDropdownOpen(!dropdownOpen);
    };

    return (
        <div className={styles.header}>
            <div className={styles.logo}>
                <Link href="/">
                    <Image src="/logo.png" alt="logo" width={100} height={100} />
                </Link>
            </div>
            <div className={styles.navLinks}>
                <Link href="/">Home</Link>
                
                <Link href="/contact">Access Compute</Link>

                <div
                    className={styles.dropdown}
                    onMouseEnter={toggleDropdown}
                    onMouseLeave={toggleDropdown}
                >
                    <span className={styles.dropdownLink}>Provide Compute  <span className='opacity-30'>V</span> </span>
                    {dropdownOpen && (
                        <div className={styles.dropdownMenu}>
                            <Link href="/closeModelCard">Closed-source Model</Link>
                            <Link href="/openModelCard">Open-source Model</Link>
                        </div>
                    )}
                </div>
            </div>
            <div className={styles.joinButton}>
                <button>Join Us</button>
            </div>
        </div>
    );
}
