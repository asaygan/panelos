/// A single revision of a panel's schematic / docs.
class Revision {
  const Revision({
    required this.id,
    required this.panelId,
    required this.label,
    required this.status,
    this.createdAt,
    this.author,
    this.note,
    this.fileIds = const <String>[],
  });

  final String id;
  final String panelId;
  final String label; // e.g. "Rev C"
  final String status; // draft | approved | superseded
  final DateTime? createdAt;
  final String? author;
  final String? note;
  final List<String> fileIds;

  factory Revision.fromJson(Map<String, dynamic> json) {
    final rawFiles = json['fileIds'];
    final fileIds = <String>[];
    if (rawFiles is List) {
      for (final f in rawFiles) {
        if (f is String) fileIds.add(f);
      }
    }
    return Revision(
      id: json['id'] as String,
      panelId: (json['panelId'] as String?) ?? '',
      label: (json['label'] as String?) ?? '',
      status: (json['status'] as String?) ?? 'draft',
      createdAt: json['createdAt'] is String
          ? DateTime.tryParse(json['createdAt'] as String)
          : null,
      author: json['author'] as String?,
      note: json['note'] as String?,
      fileIds: fileIds,
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
        'id': id,
        'panelId': panelId,
        'label': label,
        'status': status,
        if (createdAt != null) 'createdAt': createdAt!.toIso8601String(),
        if (author != null) 'author': author,
        if (note != null) 'note': note,
        'fileIds': fileIds,
      };

  Revision copyWith({
    String? id,
    String? panelId,
    String? label,
    String? status,
    DateTime? createdAt,
    String? author,
    String? note,
    List<String>? fileIds,
  }) {
    return Revision(
      id: id ?? this.id,
      panelId: panelId ?? this.panelId,
      label: label ?? this.label,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      author: author ?? this.author,
      note: note ?? this.note,
      fileIds: fileIds ?? this.fileIds,
    );
  }
}
