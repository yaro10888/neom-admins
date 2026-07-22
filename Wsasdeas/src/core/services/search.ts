/** البحث العالمي عبر كل كيانات النظام. */

import type { DatabaseSnapshot, PermissionResource } from '../domain/types';
import { matchesSearch } from '../utils/format';

export interface SearchResult {
  id: string;
  /** القسم الذي ينتمي إليه العنصر — يُستخدم أيضاً للتحقق من الصلاحية. */
  resource: PermissionResource;
  /** اسم القسم بالعربية للعرض. */
  group: string;
  title: string;
  subtitle: string;
  href: string;
  icon: string;
}

/**
 * يبحث في الأعضاء والمشاريع والمهام والإدارات والعمليات المالية والملاحظات.
 * `allowed` تحدد الأقسام التي يملك المستخدم صلاحية رؤيتها، فلا تظهر له
 * نتائج من أقسام ممنوعة عليه.
 */
export function globalSearch(
  snapshot: DatabaseSnapshot,
  query: string,
  allowed: (resource: PermissionResource) => boolean,
  limit = 24,
): SearchResult[] {
  const term = query.trim();
  if (term.length < 1) return [];

  const results: SearchResult[] = [];

  if (allowed('members')) {
    snapshot.members
      .filter(
        (member) =>
          matchesSearch(member.name, term) ||
          matchesSearch(member.specialty, term) ||
          matchesSearch(member.robloxUsername ?? '', term),
      )
      .forEach((member) => {
        const department = snapshot.departments.find((d) => d.id === member.departmentId);
        results.push({
          id: member.id,
          resource: 'members',
          group: 'الأعضاء',
          title: member.name,
          subtitle: `${member.specialty}${department ? ` — ${department.name}` : ''}`,
          href: `/members/view?id=${member.id}`,
          icon: 'user',
        });
      });
  }

  if (allowed('projects')) {
    snapshot.projects
      .filter(
        (project) =>
          matchesSearch(project.name, term) || matchesSearch(project.description, term),
      )
      .forEach((project) => {
        results.push({
          id: project.id,
          resource: 'projects',
          group: 'المشاريع',
          title: project.name,
          subtitle: `نسبة الإنجاز ${project.progress}%`,
          href: '/projects',
          icon: 'folder',
        });
      });
  }

  if (allowed('tasks')) {
    snapshot.tasks
      .filter((task) => matchesSearch(task.title, term) || matchesSearch(task.description, term))
      .forEach((task) => {
        const assignee = snapshot.members.find((m) => m.id === task.assigneeId);
        results.push({
          id: task.id,
          resource: 'tasks',
          group: 'المهام',
          title: task.title,
          subtitle: assignee ? `المسؤول: ${assignee.name}` : 'بدون مسؤول',
          href: '/tasks',
          icon: 'check-square',
        });
      });
  }

  if (allowed('departments')) {
    snapshot.departments
      .filter(
        (department) =>
          matchesSearch(department.name, term) || matchesSearch(department.description, term),
      )
      .forEach((department) => {
        results.push({
          id: department.id,
          resource: 'departments',
          group: 'الإدارات',
          title: department.name,
          subtitle: department.description,
          href: '/departments',
          icon: 'building',
        });
      });
  }

  if (allowed('finance')) {
    snapshot.transactions
      .filter(
        (transaction) =>
          matchesSearch(transaction.description, term) ||
          matchesSearch(transaction.category, term),
      )
      .forEach((transaction) => {
        results.push({
          id: transaction.id,
          resource: 'finance',
          group: 'العمليات المالية',
          title: transaction.description,
          subtitle: `${transaction.category} — ${transaction.amount}`,
          href: '/finance',
          icon: 'wallet',
        });
      });
  }

  if (allowed('campaigns')) {
    snapshot.campaigns
      .filter(
        (campaign) =>
          matchesSearch(campaign.name, term) || matchesSearch(campaign.platform, term),
      )
      .forEach((campaign) => {
        results.push({
          id: campaign.id,
          resource: 'campaigns',
          group: 'الحملات',
          title: campaign.name,
          subtitle: campaign.platform,
          href: '/campaigns',
          icon: 'megaphone',
        });
      });
  }

  if (allowed('notes')) {
    snapshot.notes
      .filter((note) => matchesSearch(note.content, term))
      .forEach((note) => {
        const member = snapshot.members.find((m) => m.id === note.memberId);
        results.push({
          id: note.id,
          resource: 'notes',
          group: 'الملاحظات',
          title: note.content,
          subtitle: member ? `عن: ${member.name}` : 'ملاحظة',
          href: '/notes',
          icon: 'sticky-note',
        });
      });
  }

  return results.slice(0, limit);
}
