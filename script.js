document.addEventListener('DOMContentLoaded', () => {
    const issuesContainer = document.getElementById('issues-container');

    const funCategories = {
        'Bug Hunt': {
            emoji: '🐛',
            keywords: ['bug'],
            issues: []
        },
        'Feature Quest': {
            emoji: '✨',
            keywords: ['feature', 'enhancement'],
            issues: []
        },
        'Documentation Scrolls': {
            emoji: '📜',
            keywords: ['documentation', 'docs'],
            issues: []
        },
        'Good First Issue': {
            emoji: '🌱',
            keywords: ['good first issue'],
            issues: []
        },
        'Mysterious Quests': {
            emoji: '❓',
            keywords: [],
            issues: []
        }
    };

    async function fetchIssues() {
        try {
            const response = await fetch('https://api.github.com/repos/google-gemini/gemini-cli/issues?state=open');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const issues = await response.json();
            classifyAndDisplayIssues(issues);
        } catch (error) {
            issuesContainer.innerHTML = `<p>Could not fetch issues: ${error.message}</p>`;
        }
    }

    function classifyAndDisplayIssues(issues) {
        if (issues.length === 0) {
            issuesContainer.innerHTML = '<h2>No open quests! The kingdom is at peace. ✨</h2>';
            return;
        }

        // Classify issues
        issues.forEach(issue => {
            const labels = issue.labels.map(l => l.name.toLowerCase());
            let classified = false;
            for (const categoryName in funCategories) {
                const category = funCategories[categoryName];
                if (category.keywords.length > 0 && category.keywords.some(kw => labels.includes(kw))) {
                    category.issues.push(issue);
                    classified = true;
                    break;
                }
            }
            if (!classified) {
                funCategories['Mysterious Quests'].issues.push(issue);
            }
        });

        // Clear the container
        issuesContainer.innerHTML = '';

        // Display issues by category
        for (const categoryName in funCategories) {
            const category = funCategories[categoryName];
            if (category.issues.length > 0) {
                const categoryHeader = document.createElement('h2');
                categoryHeader.textContent = `${category.emoji} ${categoryName}`;
                issuesContainer.appendChild(categoryHeader);

                category.issues.forEach(issue => {
                    const issueDiv = createIssueElement(issue);
                    issuesContainer.appendChild(issueDiv);
                });
            }
        }
    }

    function createIssueElement(issue) {
        const issueDiv = document.createElement('div');
        issueDiv.className = 'issue';

        const title = document.createElement('h3');
        const link = document.createElement('a');
        link.href = issue.html_url;
        link.textContent = issue.title;
        link.target = '_blank';
        title.appendChild(link);

        const details = document.createElement('div');
        details.className = 'details';
        details.textContent = `#${issue.number} opened by ${issue.user.login}`;

        const labelsDiv = document.createElement('div');
        labelsDiv.className = 'labels';

        issue.labels.forEach(label => {
            const labelSpan = document.createElement('span');
            labelSpan.className = 'label';
            labelSpan.textContent = label.name;
            // A simple hash function for label colors for variety
            labelSpan.style.backgroundColor = `#${(parseInt(label.color, 16) * 0.9).toString(16).slice(0, 6)}`;
            labelsDiv.appendChild(labelSpan);
        });

        issueDiv.appendChild(title);
        issueDiv.appendChild(details);
        issueDiv.appendChild(labelsDiv);
        return issueDiv;
    }

    fetchIssues();
});