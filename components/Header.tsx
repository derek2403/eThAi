

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
                    <span className={styles.dropdownLink}>Provide Compute &ensp; ᐯ</span>
                    {dropdownOpen && (
                        <div className={styles.dropdownMenu}>
                            <Link href="/closed-source">Closed-source Model</Link>
                            <Link href="/open-source">Open-source Model</Link>
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
